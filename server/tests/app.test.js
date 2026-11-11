import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/User.js";

describe("ALLIN API Tests", () => {
    let testToken;

    beforeAll(() => {
        const mockUserId = "65f123456789012345678901";
        const secret = process.env.JWT_SECRET || "allin_default_super_secret_jwt_key_2026";
        testToken = jwt.sign({ userId: mockUserId }, secret, { expiresIn: "1h" });

        jest.spyOn(User, "findById").mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: mockUserId,
                name: "Test User",
                email: "test@allin.io"
            })
        });
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

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

    // Payment validation & security
    describe("POST /api/payments/create-order security & validation", () => {
        it("should reject unauthenticated payment order requests with 401", async () => {
            const response = await request(app)
                .post("/api/payments/create-order")
                .send({ amount: 50 });

            expect(response.statusCode).toBe(401);
        });

        it("should reject order creation with invalid or missing amount when authenticated", async () => {
            const response = await request(app)
                .post("/api/payments/create-order")
                .set("Authorization", `Bearer ${testToken}`)
                .send({ amount: -10 });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // Expense validation & security
    describe("POST /api/expenses security & validation", () => {
        it("should reject unauthenticated expense creation requests with 401", async () => {
            const response = await request(app)
                .post("/api/expenses")
                .send({ title: "Coffee", amount: 10 });

            expect(response.statusCode).toBe(401);
        });

        it("should reject expense creation without title when authenticated", async () => {
            const response = await request(app)
                .post("/api/expenses")
                .set("Authorization", `Bearer ${testToken}`)
                .send({ amount: 50 });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject expense creation with non-positive amount when authenticated", async () => {
            const response = await request(app)
                .post("/api/expenses")
                .set("Authorization", `Bearer ${testToken}`)
                .send({ title: "Coffee", amount: 0 });

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // Prometheus metrics endpoint
    describe("GET /metrics", () => {
        it("should expose prometheus metrics with text/plain format", async () => {
            const response = await request(app).get("/metrics");

            expect(response.statusCode).toBe(200);
            expect(response.text).toContain("allin_");
            expect(response.headers["content-type"]).toContain("text/plain");
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
