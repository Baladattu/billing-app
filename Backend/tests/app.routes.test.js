const request = require("supertest");
const app = require("../src/app");

describe("App routes", () => {
    it("GET / should return welcome message", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(200);
        expect(response.text).toContain("Welcome to the Billing App Backend");
    });

    it("GET /health should return degraded when db is disconnected in test", async () => {
        const response = await request(app).get("/health");

        expect(response.status).toBe(503);
        expect(response.body).toMatchObject({
            status: "DEGRADED",
            database: "disconnected",
        });
    });

    it("GET /api/v1/products should reject when token is missing", async () => {
        const response = await request(app).get("/api/v1/products");

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it("POST /api/v1/auth/login should validate required fields", async () => {
        const response = await request(app).post("/api/v1/auth/login").send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("email and password are required");
    });
});
