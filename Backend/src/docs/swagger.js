const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerDefinition = {
    openapi: "3.0.3",
    info: {
        title: "Billing App Backend API",
        version: "1.0.0",
        description: "API documentation for Billing App backend.",
    },
    servers: [
        {
            url: "http://localhost:3000",
            description: "Local server",
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
        schemas: {
            LoginRequest: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", example: "admin@test.com" },
                    password: { type: "string", example: "Pass@123" },
                },
            },
            UserCreateRequest: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                    name: { type: "string", example: "Customer One" },
                    email: { type: "string", example: "customer1@test.com" },
                    password: { type: "string", example: "Pass@123" },
                    phone: { type: "string", example: "9999999999" },
                    role: { type: "string", enum: ["superadmin", "admin", "customer"] },
                    isActive: { type: "boolean", example: true },
                },
            },
            ProductCreateRequest: {
                type: "object",
                required: ["name", "price"],
                properties: {
                    name: { type: "string", example: "Milk 1L" },
                    price: { type: "number", example: 120 },
                    sku: { type: "string", example: "MILK-1L" },
                    unit: { type: "string", example: "pcs" },
                    isActive: { type: "boolean", example: true },
                },
            },
            BillCreateRequest: {
                type: "object",
                required: ["customerId", "items"],
                properties: {
                    customerId: { type: "string", example: "680fd0d7ac89beef0f7bf001" },
                    billedBy: { type: "string", example: "680fd0d7ac89beef0f7bf002" },
                    billDate: { type: "string", format: "date-time" },
                    discount: { type: "number", example: 10 },
                    tax: { type: "number", example: 0 },
                    paidAmount: { type: "number", example: 50 },
                    paymentMode: { type: "string", enum: ["cash", "online", "partial"] },
                    transactionRef: { type: "string", example: "txn-1001" },
                    notes: { type: "string", example: "Monthly delivery" },
                    items: {
                        type: "array",
                        minItems: 1,
                        items: {
                            type: "object",
                            required: ["productId", "quantity"],
                            properties: {
                                productId: { type: "string", example: "680fd0d7ac89beef0f7bf010" },
                                quantity: { type: "number", example: 2 },
                            },
                        },
                    },
                },
            },
            CollectPaymentRequest: {
                type: "object",
                required: ["amount", "paymentMode"],
                properties: {
                    amount: { type: "number", example: 180 },
                    paymentMode: { type: "string", enum: ["cash", "online", "partial"] },
                    transactionRef: { type: "string", example: "txn-1002" },
                },
            },
            ApiResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Success" },
                    data: { type: "object" },
                },
            },
        },
    },
    tags: [
        { name: "System" },
        { name: "Auth" },
        { name: "Users" },
        { name: "Products" },
        { name: "Bills" },
        { name: "Dues" },
        { name: "Dashboard" },
    ],
    paths: {
        "/": {
            get: {
                tags: ["System"],
                summary: "Welcome route",
                responses: {
                    200: {
                        description: "Welcome message",
                    },
                },
            },
        },
        "/health": {
            get: {
                tags: ["System"],
                summary: "Health check",
                responses: {
                    200: { description: "App and DB healthy" },
                    503: { description: "App running but DB not ready" },
                },
            },
        },
        "/error": {
            get: {
                tags: ["System"],
                summary: "Test error-style response",
                responses: {
                    500: { description: "Returns a sample failure response" },
                },
            },
        },
        "/api/v1/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Login user",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LoginRequest" },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Login successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiResponse" },
                            },
                        },
                    },
                    401: { description: "Invalid credentials" },
                },
            },
        },
        "/api/v1/users": {
            post: {
                tags: ["Users"],
                summary: "Create user",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UserCreateRequest" },
                        },
                    },
                },
                responses: {
                    201: { description: "User created" },
                    403: { description: "Forbidden" },
                },
            },
            get: {
                tags: ["Users"],
                summary: "List users",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer" } },
                    { name: "limit", in: "query", schema: { type: "integer" } },
                    { name: "role", in: "query", schema: { type: "string" } },
                    { name: "isActive", in: "query", schema: { type: "boolean" } },
                ],
                responses: {
                    200: { description: "Users list" },
                    403: { description: "Forbidden" },
                },
            },
        },
        "/api/v1/users/{id}": {
            get: {
                tags: ["Users"],
                summary: "Get user by id",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    200: { description: "User details" },
                    403: { description: "Forbidden" },
                    404: { description: "Not found" },
                },
            },
            patch: {
                tags: ["Users"],
                summary: "Update user by id",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object" },
                        },
                    },
                },
                responses: {
                    200: { description: "User updated" },
                    403: { description: "Forbidden" },
                    404: { description: "Not found" },
                },
            },
        },
        "/api/v1/products": {
            post: {
                tags: ["Products"],
                summary: "Create product",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductCreateRequest" },
                        },
                    },
                },
                responses: {
                    201: { description: "Product created" },
                    403: { description: "Forbidden" },
                },
            },
            get: {
                tags: ["Products"],
                summary: "List products",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer" } },
                    { name: "limit", in: "query", schema: { type: "integer" } },
                    { name: "search", in: "query", schema: { type: "string" } },
                    { name: "isActive", in: "query", schema: { type: "boolean" } },
                ],
                responses: {
                    200: { description: "Products list" },
                },
            },
        },
        "/api/v1/products/{id}": {
            get: {
                tags: ["Products"],
                summary: "Get product by id",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    200: { description: "Product details" },
                    404: { description: "Not found" },
                },
            },
            patch: {
                tags: ["Products"],
                summary: "Update product by id",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object" },
                        },
                    },
                },
                responses: {
                    200: { description: "Product updated" },
                    403: { description: "Forbidden" },
                    404: { description: "Not found" },
                },
            },
        },
        "/api/v1/bills": {
            post: {
                tags: ["Bills"],
                summary: "Create bill",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BillCreateRequest" },
                        },
                    },
                },
                responses: {
                    201: { description: "Bill created" },
                    403: { description: "Forbidden" },
                },
            },
            get: {
                tags: ["Bills"],
                summary: "List bills",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer" } },
                    { name: "limit", in: "query", schema: { type: "integer" } },
                    { name: "customerId", in: "query", schema: { type: "string" } },
                    { name: "status", in: "query", schema: { type: "string" } },
                    { name: "billNumber", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    200: { description: "Bills list" },
                },
            },
        },
        "/api/v1/bills/{id}": {
            get: {
                tags: ["Bills"],
                summary: "Get bill by id",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    200: { description: "Bill details" },
                    404: { description: "Not found" },
                },
            },
        },
        "/api/v1/bills/{id}/collect": {
            patch: {
                tags: ["Bills"],
                summary: "Collect bill payment",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CollectPaymentRequest" },
                        },
                    },
                },
                responses: {
                    200: { description: "Payment collected" },
                    403: { description: "Forbidden" },
                },
            },
        },
        "/api/v1/dues": {
            get: {
                tags: ["Dues"],
                summary: "List dues",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer" } },
                    { name: "limit", in: "query", schema: { type: "integer" } },
                    { name: "customerId", in: "query", schema: { type: "string" } },
                    { name: "status", in: "query", schema: { type: "string" } },
                    { name: "isCollected", in: "query", schema: { type: "boolean" } },
                ],
                responses: {
                    200: { description: "Dues list" },
                },
            },
        },
        "/api/v1/dues/{id}": {
            get: {
                tags: ["Dues"],
                summary: "Get due by id",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    200: { description: "Due details" },
                    404: { description: "Not found" },
                },
            },
        },
        "/api/v1/dues/{id}/collect": {
            patch: {
                tags: ["Dues"],
                summary: "Collect due payment",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CollectPaymentRequest" },
                        },
                    },
                },
                responses: {
                    200: { description: "Due collected" },
                    403: { description: "Forbidden" },
                },
            },
        },
        "/api/v1/dashboard/summary": {
            get: {
                tags: ["Dashboard"],
                summary: "Get dashboard summary",
                security: [{ BearerAuth: [] }],
                responses: {
                    200: { description: "Dashboard summary" },
                    403: { description: "Forbidden" },
                },
            },
        },
    },
};

const swaggerSpec = swaggerJsdoc({
    definition: swaggerDefinition,
    apis: [],
});

module.exports = {
    swaggerUi,
    swaggerSpec,
};
