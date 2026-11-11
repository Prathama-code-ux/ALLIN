import request from "supertest";
import app from "../src/app.js";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import Group from "../src/models/Group.js";
import Expense from "../src/models/expense.js";
import Payment from "../src/models/payment.js";

describe("ALLIN Full-Stack End-to-End Integration Suite", () => {
    let authToken;
    let testUser;
    let testGroup;
    let createdExpenseId;
    let paypalOrderId;

    const uniqueId = Date.now();
    const testEmail = `fintech.tester.${uniqueId}@allin.io`;

    beforeAll(async () => {
        // Connect to MongoDB Atlas
        await connectDB();
    }, 20000);

    afterAll(async () => {
        // Cleanup test data created during this suite
        try {
            if (testUser?._id) {
                await User.deleteOne({ _id: testUser._id });
            }
            if (testGroup?._id) {
                await Group.deleteOne({ _id: testGroup._id });
            }
            if (createdExpenseId) {
                await Expense.deleteOne({ _id: createdExpenseId });
            }
            if (paypalOrderId) {
                await Payment.deleteOne({ paypalOrderId });
            }
        } catch (ignore) {}

        await mongoose.connection.close();
    }, 15000);

    // 1. User Registration
    it("1. User registration creates user and returns JWT token", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Alex Sandbox",
                email: testEmail,
                password: "SecurePassword123!"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(testEmail);

        testUser = res.body.user;
        authToken = res.body.token;
    });

    // 2. User Login
    it("2. User login verifies password and returns JWT token", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: "SecurePassword123!"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(testEmail);
    });

    // 3. Protected Route Verification
    it("3. GET /api/auth/me succeeds with valid Bearer token", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.user.id).toBe(testUser.id);
    });

    it("3b. GET /api/auth/me fails when unauthenticated", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.statusCode).toBe(401);
    });

    // 4. Group Creation
    it("4. Group creation creates group with unique invite code", async () => {
        const res = await request(app)
            .post("/api/groups")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                name: "Goa Vacation Crew",
                description: "Trip expenses and collaborative pool",
                targetAmount: 300
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.group).toBeDefined();
        expect(res.body.group.name).toBe("Goa Vacation Crew");
        expect(res.body.group.inviteCode).toBeDefined();

        testGroup = res.body.group;
    });

    // 5. Group Member Management & Fetch Groups
    it("5. GET /api/groups retrieves user groups", async () => {
        const res = await request(app)
            .get("/api/groups")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.groups.length).toBeGreaterThan(0);
    });

    // 6. Contribution Calculations
    it("6. GET /api/groups/:id/contributions calculates member shares & progress", async () => {
        const res = await request(app)
            .get(`/api/groups/${testGroup.id}/contributions`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.targetAmount).toBe(300);
        expect(res.body.contributions).toBeDefined();
        expect(res.body.contributions.length).toBeGreaterThan(0);
        expect(res.body.contributions[0].name).toBe("Alex Sandbox");
    });

    // 7. Expense Creation in MongoDB
    it("7. POST /api/expenses creates and persists expense in MongoDB", async () => {
        const res = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                title: "Resort booking",
                category: "Travel",
                amount: 150.0,
                date: "2026-11-10",
                description: "Deposit for beachfront villa",
                groupId: testGroup.id
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.expense.title).toBe("Resort booking");
        expect(res.body.expense.amount).toBe(150.0);

        createdExpenseId = res.body.expense.id;
    });

    // 8. Expense Retrieval & Filtering
    it("8. GET /api/expenses retrieves list of expenses", async () => {
        const res = await request(app)
            .get("/api/expenses")
            .query({ groupId: testGroup.id });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.expenses.length).toBeGreaterThan(0);
    });

    // 9. Expense Summary Metrics
    it("9. GET /api/expenses/summary aggregates totals and category metrics", async () => {
        const res = await request(app)
            .get("/api/expenses/summary")
            .query({ groupId: testGroup.id });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.totalExpenses).toBeGreaterThanOrEqual(150.0);
        expect(res.body.categoryTotals.length).toBeGreaterThan(0);
    });

    // 10. Expense Update
    it("10. PUT /api/expenses/:id updates expense fields in MongoDB", async () => {
        const res = await request(app)
            .put(`/api/expenses/${createdExpenseId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                title: "Resort booking (Confirmed)",
                amount: 165.0
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.expense.title).toBe("Resort booking (Confirmed)");
        expect(res.body.expense.amount).toBe(165.0);
    });

    // 11. PayPal Sandbox Live Order Creation
    it("11. POST /api/payments/create-order calls PayPal API and returns approval URL", async () => {
        const res = await request(app)
            .post("/api/payments/create-order")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                amount: 55.35,
                currency: "USD",
                groupId: testGroup.id,
                description: "Contribution for Alex Sandbox"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.orderId).toBeDefined();
        expect(res.body.approvalURL).toBeDefined();
        expect(res.body.approvalURL).toContain("sandbox.paypal.com");

        paypalOrderId = res.body.orderId;
    }, 20000);

    // 12. Transaction History
    it("12. GET /api/payments/transactions retrieves real MongoDB transaction log", async () => {
        const res = await request(app)
            .get("/api/payments/transactions")
            .query({ groupId: testGroup.id });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.transactions).toBeDefined();
    });

    // 13. Expense Deletion
    it("13. DELETE /api/expenses/:id removes expense from MongoDB", async () => {
        const res = await request(app)
            .delete(`/api/expenses/${createdExpenseId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
