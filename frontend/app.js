// ==========================================
// CAFÉCLOUD - CONFIGURACIÓN
// ==========================================

const API_URL = "https://3qg7iozqj8.execute-api.us-east-2.amazonaws.com/pedidos";

let PRODUCTOS = {};

const carrito = {};

// ==========================================
// CARGAR PRODUCTOS DESDE DYNAMODB
// ==========================================

async function cargarProductos() {
    try {
        const respuesta = await fetch(
            API_URL.replace("/pedidos", "/productos")
        );

        if (!respuesta.ok) {
            throw new Error("No fue posible cargar los productos.");
        }

        const resultado = await respuesta.json();

        PRODUCTOS = {};

        resultado.productos.forEach(producto => {
            PRODUCTOS[producto.producto] = Number(producto.precio);
        });

        console.log("Productos cargados:", PRODUCTOS);
        renderizarProductos();

        // Habilitar selección después de cargar el menú.
        document.querySelectorAll(".choose-button").forEach(boton => {
            boton.disabled = false;
        });

    } catch (error) {
        console.error("Error cargando productos:", error);
        mostrarMensaje(
            "No fue posible cargar el menú. Intenta actualizar.",
            "error"
        );
    }
}

// ==========================================
// ELEMENTOS HTML
// ==========================================

const orderForm = document.getElementById("orderForm");
const customerInput = document.getElementById("customer");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const pricePreview = document.getElementById("pricePreview");
const formMessage = document.getElementById("formMessage");
const submitOrder = document.getElementById("submitOrder");
const ordersList = document.getElementById("ordersList");
const ordersCount = document.getElementById("ordersCount");
const refreshOrders = document.getElementById("refreshOrders");

// ==========================================
// FUNCIONES GENERALES
// ==========================================

function formatoCOP(valor) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

function obtenerCantidadTotal() {
    return Object.values(carrito).reduce(
        (total, cantidad) => total + cantidad,
        0
    );
}

function obtenerTotal() {
    return Object.entries(carrito).reduce(
        (total, [producto, cantidad]) =>
            total + PRODUCTOS[producto] * cantidad,
        0
    );
}

// ==========================================
// AGREGAR PRODUCTOS
// ==========================================

function agregarProducto(producto) {
    if (!Object.prototype.hasOwnProperty.call(PRODUCTOS, producto)) {
        mostrarMensaje("El producto seleccionado no está disponible.", "error");
        return;
    }

    if (!carrito[producto]) {
        carrito[producto] = 1;
    } else if (carrito[producto] < 20) {
        carrito[producto]++;
    } else {
        mostrarMensaje("Máximo 20 unidades por producto.", "error");
        return;
    }

    mostrarMensaje(`${producto} agregado al carrito.`, "success");
    renderizarCarrito();

    document.getElementById("pedidos").scrollIntoView({
        behavior: "smooth"
    });
}

// ==========================================
// CAMBIAR CANTIDADES
// ==========================================

function cambiarCantidad(producto, cambio) {
    if (!carrito[producto]) return;

    const nuevaCantidad = carrito[producto] + cambio;

    if (nuevaCantidad <= 0) {
        delete carrito[producto];
    } else if (nuevaCantidad <= 20) {
        carrito[producto] = nuevaCantidad;
    } else {
        mostrarMensaje("Máximo 20 unidades por producto.", "error");
    }

    renderizarCarrito();
}

// ==========================================
// ELIMINAR PRODUCTOS
// ==========================================

function eliminarProducto(producto) {
    delete carrito[producto];
    renderizarCarrito();
}

// ==========================================
// MOSTRAR CARRITO
// ==========================================

function renderizarCarrito() {
    const productos = Object.entries(carrito);
    const cantidadTotal = obtenerCantidadTotal();
    const total = obtenerTotal();

    cartCount.textContent =
        `${cantidadTotal} ${cantidadTotal === 1 ? "producto" : "productos"}`;

    pricePreview.textContent = formatoCOP(total);

    if (productos.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <span>☕</span>
                <p>Tu carrito está vacío.</p>
                <small>Selecciona una bebida del menú para comenzar.</small>
            </div>
        `;
        return;
    }

    cartItems.innerHTML = productos.map(([producto, cantidad]) => {
        const precio = PRODUCTOS[producto];
        const subtotal = precio * cantidad;

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${producto}</strong>
                    <small>${formatoCOP(precio)} por unidad</small>
                    <span class="cart-subtotal">${formatoCOP(subtotal)}</span>
                </div>

                <div class="cart-controls">
                    <button
                        type="button"
                        class="quantity-button"
                        data-action="decrease"
                        data-product="${producto}"
                        aria-label="Disminuir ${producto}"
                    >−</button>

                    <span class="quantity-value">${cantidad}</span>

                    <button
                        type="button"
                        class="quantity-button"
                        data-action="increase"
                        data-product="${producto}"
                        aria-label="Aumentar ${producto}"
                    >+</button>

                    <button
                        type="button"
                        class="remove-button"
                        data-action="remove"
                        data-product="${producto}"
                        aria-label="Eliminar ${producto}"
                    >Eliminar</button>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// EVENTOS DEL CARRITO
// ==========================================

document.getElementById("productsGrid").addEventListener("click", event => {
    const boton = event.target.closest(".choose-button");

    if (!boton) return;

    agregarProducto(boton.dataset.product);
});

cartItems.addEventListener("click", event => {
    const boton = event.target.closest("button[data-action]");
    if (!boton) return;

    const producto = boton.dataset.product;
    const accion = boton.dataset.action;

    if (accion === "increase") {
        cambiarCantidad(producto, 1);
    } else if (accion === "decrease") {
        cambiarCantidad(producto, -1);
    } else if (accion === "remove") {
        eliminarProducto(producto);
    }
});

// ==========================================
// MENSAJES
// ==========================================

function mostrarMensaje(mensaje, tipo) {
    formMessage.textContent = mensaje;
    formMessage.className = `form-message ${tipo}`;
}

// ==========================================
// REGISTRAR PEDIDO EN LAMBDA
// ==========================================

orderForm.addEventListener("submit", async event => {
    event.preventDefault();

    const customer = customerInput.value.trim();

    if (!customer) {
        mostrarMensaje("Escribe el nombre del cliente.", "error");
        customerInput.focus();
        return;
    }

    if (Object.keys(carrito).length === 0) {
        mostrarMensaje("Agrega al menos un producto al carrito.", "error");
        return;
    }

    const items = Object.entries(carrito).map(([product, quantity]) => ({
        product,
        quantity
    }));

    const pedido = {
        customer,
        items
    };

    submitOrder.disabled = true;
    submitOrder.textContent = "Registrando pedido...";
    mostrarMensaje("Enviando tu pedido...", "info");

    try {
        const respuesta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pedido)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.message ||
                resultado.error ||
                "No fue posible registrar el pedido."
            );
        }

        mostrarMensaje(
            resultado.message || "¡Tu pedido fue registrado correctamente!",
            "success"
        );

        // Limpiar carrito y formulario después del registro.
        Object.keys(carrito).forEach(producto => delete carrito[producto]);
        orderForm.reset();
        renderizarCarrito();

        // Actualizar historial.
        await cargarPedidos();

    } catch (error) {
        console.error("Error al registrar pedido:", error);
        mostrarMensaje(
            error.message || "Ocurrió un error al registrar el pedido.",
            "error"
        );
    } finally {
        submitOrder.disabled = false;
        submitOrder.textContent = "Registrar pedido →";
    }
});

// ==========================================
// CONSULTAR HISTORIAL DE PEDIDOS
// ==========================================

async function cargarPedidos() {
    ordersList.innerHTML = `<p class="history-empty">Consultando pedidos...</p>`;

    try {
        const respuesta = await fetch(API_URL, {
            method: "GET"
        });

        if (!respuesta.ok) {
            throw new Error("No fue posible consultar los pedidos.");
        }

        const resultado = await respuesta.json();
        const pedidos = resultado.pedidos || [];

        pedidos.sort((a, b) =>
            String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        );

        ordersCount.textContent = pedidos.length;

        if (pedidos.length === 0) {
            ordersList.innerHTML = `
                <p class="history-empty">
                    Todavía no hay pedidos registrados.
                </p>
            `;
            return;
        }

        ordersList.innerHTML = pedidos.map(pedido => {
            const items = Array.isArray(pedido.items) && pedido.items.length
                ? pedido.items
                : [{
                    product: pedido.product || "Producto",
                    quantity: Number(pedido.quantity) || 1,
                    price: Number(pedido.price) || 0,
                    total: Number(pedido.total) || 0
                }];

            const detalle = items.map(item => {
                const producto = item.product || "Producto";
                const cantidad = Number(item.quantity) || 1;
                const precio = Number(item.price) || PRODUCTOS[producto] || 0;
                const subtotal = Number(item.total) || precio * cantidad;

                return `
                    <div class="history-product">
                        <span>${producto} × ${cantidad}</span>
                        <strong>${formatoCOP(subtotal)}</strong>
                    </div>
                `;
            }).join("");

            const total = Number(pedido.total) ||
                items.reduce((suma, item) => {
                    const precio = Number(item.price) || PRODUCTOS[item.product] || 0;
                    return suma + (Number(item.total) || precio * (Number(item.quantity) || 1));
                }, 0);

            const fecha = pedido.createdAt
                ? new Date(pedido.createdAt).toLocaleString("es-CO")
                : "Fecha no disponible";

            return `
                <article class="order-card">
                    <div class="order-card-header">
                        <div>
                            <span class="order-label">CLIENTE</span>
                            <h3>${escaparHTML(pedido.customer || "Sin nombre")}</h3>
                        </div>
                        <span class="status-badge">
                            ${escaparHTML(pedido.status || "Registrado")}
                        </span>
                    </div>

                    <div class="history-products">
                        ${detalle}
                    </div>

                    <div class="order-card-footer">
                        <span>${escaparHTML(fecha)}</span>
                        <strong>Total: ${formatoCOP(total)}</strong>
                    </div>
                </article>
            `;
        }).join("");

    } catch (error) {
        console.error("Error consultando pedidos:", error);
        ordersCount.textContent = "—";
        ordersList.innerHTML = `
            <p class="history-empty error">
                No se pudo cargar el historial. Intenta actualizar.
            </p>
        `;
    }
}

// Evitar insertar texto recibido del servidor como HTML.
function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caracter]);
}

// ==========================================
// ACTUALIZAR HISTORIAL
// ==========================================

refreshOrders.addEventListener("click", cargarPedidos);

// ==========================================
// INICIO
// ==========================================

renderizarCarrito();
cargarProductos();
// ==========================================
// MOSTRAR PRODUCTOS DINÁMICAMENTE
// ==========================================

function renderizarProductos() {
    const productsGrid = document.getElementById("productsGrid");

    if (!productsGrid) return;

    const productos = Object.entries(PRODUCTOS);

    if (productos.length === 0) {
        productsGrid.innerHTML = "<p>No hay productos disponibles.</p>";
        return;
    }

    productsGrid.innerHTML = productos.map(([nombre, precio]) => `
        <article class="product-card">
            <div class="product-visual">
                <span>☕</span>
            </div>

            <div class="product-info">
                <span class="product-category">CAFÉ CLOUD</span>
                <h3>${escaparHTML(nombre)}</h3>

                <p>Disfruta de esta deliciosa bebida de CaféCloud.</p>

                <div class="product-footer">
                    <strong>${formatoCOP(precio)}</strong>

                    <button
                        class="choose-button"
                        type="button"
                        data-product="${escaparHTML(nombre)}"
                    >
                        Agregar +
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}
cargarPedidos();
