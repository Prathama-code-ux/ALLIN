import request from "supertest";
import app from "../src/app.js";

describe("ALLIN API Tests", () => {

    // Health endpoint
    describe("GET /health", () => {
        it("should return healthy status", async () => {
            const response = await request(app).get("/health");

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

    // 404 endpoint
    describe("Unknown routes", () => {
        it("should return 404 for unknown routes", async () => {
            const response = await request(app).get("/unknown");

            expect(response.statusCode).toBe(404);
            expect(response.body.message).toBe("404 not found");
        });
    });

});