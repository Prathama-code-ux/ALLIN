import request from "supertest";
import app from "../src/app.js";

describe("ALLIN API Tests", () => {

    // Health endpoints
    describe("GET /health and /api/health", () => {
        it("should return healthy status on /health", async () => {
            const response = await request(app).get("/health");

            expect(response.statusCode).toBe(200);
            expect(response.body.status).toBe("healthy");
            expect(response.body.service).toBe("ALLIN");
        });

        it("should return healthy status on /api/health", async () => {
            const response = await request(app).get("/api/health");

            expect(response.statusCode).toBe(200);
            expect(response.body.status).toBe("healthy");
            expect(response.body.service).toBe("ALLIN");
        });
    });

    // Welcome endpoint
    describe("GET /", () => {
        it("should return welcome message", async () => {
            const response = await request(app).get("/");

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe("Welcome to ALLIN");
        });
    });

    // POST endpoint
    describe("POST /test", () => {
        it("should return the received JSON data", async () => {
            const data = {
                name: "Alex",
                amount: 500
            };

            const response = await request(app)
                .post("/test")
                .send(data);

            expect(response.statusCode).toBe(200);
            expect(response.body.received).toEqual(data);
        });
    });

    // Payment validation
    describe("POST /api/payments/create-order validation", () => {
        it("should reject order creation with invalid or missing amount", async () => {
            const response = await request(app)
                .post("/api/payments/create-order")
                .send({ amount: -10 });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // Expense validation
    describe("POST /api/expenses validation", () => {
        it("should reject expense creation without title", async () => {
            const response = await request(app)
                .post("/api/expenses")
                .send({ amount: 50 });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject expense creation with non-positive amount", async () => {
            const response = await request(app)
                .post("/api/expenses")
                .send({ title: "Coffee", amount: 0 });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // 404 endpoint
    describe("Unknown routes", () => {
        it("should return 404 for unknown routes", async () => {
            const response = await request(app).get("/unknown");

            expect(response.statusCode).toBe(404);
            expect(response.body.message).toBe("404 not found");
        });
    });

});
