import json
import boto3
import uuid
import os
from decimal import Decimal
from datetime import datetime, timezone

# ==========================================
# CONEXIÓN CON DYNAMODB
# ==========================================

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
PRODUCTS_TABLE_NAME = os.environ["PRODUCTS_TABLE_NAME"]

table = dynamodb.Table(TABLE_NAME)
products_table = dynamodb.Table(PRODUCTS_TABLE_NAME)


# ==========================================
# CONVERSIÓN DE DATOS
# ==========================================

def convertir_decimal(obj):
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)

    raise TypeError(
        f"Tipo no serializable: {type(obj).__name__}"
    )


def respuesta(status, datos):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        },
        "body": json.dumps(
            datos,
            ensure_ascii=False,
            default=convertir_decimal
        )
    }


# ==========================================
# CONSULTAR PRODUCTOS EN DYNAMODB
# ==========================================

def obtener_productos():

    resultado = products_table.scan()
    productos = resultado.get("Items", [])

    while "LastEvaluatedKey" in resultado:
        resultado = products_table.scan(
            ExclusiveStartKey=resultado["LastEvaluatedKey"]
        )
        productos.extend(resultado.get("Items", []))

    return {
        item["producto"]: int(item["precio"])
        for item in productos
    }


# ==========================================
# FUNCIÓN PRINCIPAL
# ==========================================

def lambda_handler(event, context):

    try:

        # Identificar método HTTP
        method = event.get("httpMethod", "")

        if not method:
            method = event.get(
                "requestContext", {}
            ).get("http", {}).get("method", "")

        path = event.get(
            "rawPath",
            event.get("path", "")
        )

        # CORS
        if method == "OPTIONS":
            return respuesta(200, {
                "message": "CORS permitido"
            })

        # ======================================
        # CONSULTAR PRODUCTOS
        # ======================================

        if method == "GET" and path.endswith("/productos"):

            productos = obtener_productos()

            return respuesta(200, {
                "message": "Productos consultados correctamente",
                "productos": [
                    {
                        "producto": nombre,
                        "precio": precio
                    }
                    for nombre, precio in productos.items()
                ]
            })

        # ======================================
        # REGISTRAR PEDIDO
        # ======================================

        if method == "POST" and path.endswith("/pedidos"):

            body = event.get("body", event)

            if isinstance(body, str):
                body = json.loads(body)

            customer = body.get("customer")
            items = body.get("items")

            if (
                not isinstance(customer, str)
                or not customer.strip()
            ):
                return respuesta(400, {
                    "error": "El nombre del cliente es obligatorio"
                })

            # Compatibilidad con formato anterior
            if items is None:
                items = [{
                    "product": body.get("product"),
                    "quantity": body.get("quantity")
                }]

            if not isinstance(items, list) or not items:
                return respuesta(400, {
                    "error": "El carrito debe contener al menos un producto"
                })

            # Obtener precios desde DynamoDB
            PRODUCTOS = obtener_productos()

            productos_pedido = []
            total = 0
            total_unidades = 0

            for item in items:

                if not isinstance(item, dict):
                    return respuesta(400, {
                        "error": "Formato de producto inválido"
                    })

                product = item.get("product")
                quantity = item.get("quantity")

                if product not in PRODUCTOS:
                    return respuesta(400, {
                        "error": f"El producto '{product}' no está disponible"
                    })

                if (
                    isinstance(quantity, bool)
                    or not isinstance(quantity, int)
                ):
                    return respuesta(400, {
                        "error": "La cantidad debe ser un número entero"
                    })

                if quantity < 1 or quantity > 20:
                    return respuesta(400, {
                        "error": "Cada producto debe tener una cantidad entre 1 y 20"
                    })

                if any(
                    p["product"] == product
                    for p in productos_pedido
                ):
                    return respuesta(400, {
                        "error": "No envíes el mismo producto dos veces"
                    })

                price = PRODUCTOS[product]
                subtotal = price * quantity

                productos_pedido.append({
                    "product": product,
                    "quantity": quantity,
                    "price": price,
                    "subtotal": subtotal
                })

                total += subtotal
                total_unidades += quantity

            # Construir pedido
            order = {
                "orderId": str(uuid.uuid4()),
                "customer": customer.strip(),
                "items": productos_pedido,
                "total": total,
                "totalItems": total_unidades,
                "status": "RECIBIDO",
                "createdAt": datetime.now(
                    timezone.utc
                ).isoformat()
            }

            if len(productos_pedido) == 1:
                order["product"] = productos_pedido[0]["product"]
                order["quantity"] = productos_pedido[0]["quantity"]
                order["price"] = productos_pedido[0]["price"]
            else:
                order["product"] = "Varios productos"
                order["quantity"] = total_unidades

            table.put_item(Item=order)

            return respuesta(201, {
                "message": "Pedido registrado correctamente",
                "pedido": order
            })

        # ======================================
        # CONSULTAR HISTORIAL DE PEDIDOS
        # ======================================

        elif method == "GET" and path.endswith("/pedidos"):

            resultado = table.scan()
            pedidos = resultado.get("Items", [])

            while "LastEvaluatedKey" in resultado:
                resultado = table.scan(
                    ExclusiveStartKey=resultado["LastEvaluatedKey"]
                )
                pedidos.extend(resultado.get("Items", []))

            pedidos.sort(
                key=lambda pedido: pedido.get("createdAt", ""),
                reverse=True
            )

            return respuesta(200, {
                "message": "Pedidos consultados correctamente",
                "pedidos": pedidos
            })

        else:
            return respuesta(404, {
                "error": "Ruta no encontrada"
            })

    except Exception as error:

        print("Error:", str(error))

        return respuesta(500, {
            "error": "Error interno del servidor"
        })

