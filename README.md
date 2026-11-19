# ProyectoCloudIntegral-CafeCloud

Sistema de gestión de pedidos para una cafetería utilizando servicios de computación en la nube de AWS.

Descripción del proyecto

CaféCloud es una aplicación web desarrollada para gestionar los pedidos de una cafetería. Permite a los usuarios consultar el catálogo de productos, seleccionar bebidas, agregarlas a un carrito y registrar sus pedidos.

El proyecto utiliza una arquitectura basada en servicios de AWS, donde el frontend se comunica con una API para procesar las solicitudes y almacenar la información en una base de datos NoSQL.

**Objetivos**

- Desarrollar una aplicación web para la gestión de pedidos de una cafetería.

- Implementar servicios de computación en la nube mediante AWS.

- Conectar el frontend con servicios backend utilizando una API.

- Almacenar y consultar información de productos y pedidos en DynamoDB.

**Tecnologías utilizadas**

- Frontend

- HTML5

- CSS3

- JavaScript

- Backend y servicios AWS

- Amazon S3: alojamiento del frontend.

- Amazon API Gateway: exposición de los endpoints de la aplicación.

- AWS Lambda: procesamiento de las solicitudes y lógica del backend.

- Amazon DynamoDB: almacenamiento de productos y pedidos.

**Arquitectura del sistema**

La aplicación utiliza la siguiente arquitectura:

El usuario accede a la aplicación web alojada en Amazon S3.

El frontend realiza solicitudes a través de Amazon API Gateway.

API Gateway invoca las funciones de AWS Lambda.

Lambda procesa las solicitudes y consulta o registra información en DynamoDB.

Los resultados se devuelven al frontend para mostrarlos al usuario.

**Funcionalidades**

Visualización del catálogo de bebidas.

Consulta de productos almacenados en DynamoDB.

Selección de productos y administración del carrito.

Registro de pedidos.

Consulta del historial de pedidos.

**Estructura del proyecto**

ProyectoCloudIntegral/
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── backend/
│
├── lambda/
│   └── lambda_function.py
│
└── README.md

**Despliegue**

El frontend se encuentra alojado en Amazon S3 y se comunica con los servicios backend mediante una API desplegada en Amazon API Gateway.

La lógica de procesamiento se ejecuta en AWS Lambda y los datos se almacenan en Amazon DynamoDB.

