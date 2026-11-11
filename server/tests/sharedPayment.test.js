import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { jest } from "@jest/globals";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import Group from "../src/models/Group.js";
import Expense from "../src/models/expense.js";
import Payment from "../src/models/payment.js";
import { paypalService } from "../src/services/paypal.service.js";

describe("Shared Expense Split & Payment Lifecycle", () => {
    let tokenUserA, tokenUserB;
    let userA, userB;
    let testGroup;
    let testExpense;
    let paypalOrderId;

    const unique = Date.now();
    const secret = process.env.JWT_SECRET || "allin_default_super_secret_jwt_key_2026";

    beforeAll(async () => {
        await connectDB();

        // Create two test users
        userA = await User.create({
            name: "Member Alpha",
            email: `alpha.${unique}@allin.io`,
            passwordHash: "hash123"
        });

        userB = await User.create({
            name: "Member Beta",
            email: `beta.${unique}@allin.io`,
            passwordHash: "hash123"
        });

        tokenUserA = jwt.sign({ userId: userA._id.toString() }, secret, { expiresIn: "1h" });
        tokenUserB = jwt.sign({ userId: userB._id.toString() }, secret, { expiresIn: "1h" });

        // Create group with both members
        testGroup = await Group.create({
            name: "Shared Trip Crew",
            description: "Test group for shared expense splits",
            targetAmount: 200,
            createdBy: userA._id,
            members: [userA._id, userB._id],
            inviteCode: `TEST${unique.toString().slice(-4)}`
        });

        // Mock PayPal SDK calls for testing order creation and capture
        jest.spyOn(paypalService, "createOrder").mockImplementation(async (amount, currency, customId, description) => ({
            id: `MOCK-ORDER-${Date.now()}`,
            status: "CREATED",
            links: [
                {
                    rel: "approve",
                    href: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK-ORDER-${Date.now()}`
                }
            ]
        }));

        jest.spyOn(paypalService, "captureOrder").mockImplementation(async (orderId) => ({
            id: `CAPTURE-${Date.now()}`,
            status: "COMPLETED",
            purchase_units: [
                {
                    payments: {
                        captures: [
                            {
                                id: `CAPTURE-${Date.now()}`,
                                amount: { value: "37.50", currency_code: "USD" },
                                status: "COMPLETED"
                            }
                        ]
                    }
                }
            ],
            payer: {
                name: { given_name: "Member", surname: "Beta" },
                email_address: `beta.${unique}@allin.io`
            }
        }));
    }, 20000);

    afterAll(async () => {
        try {
            if (userA?._id) await User.deleteOne({ _id: userA._id });
            if (userB?._id) await User.deleteOne({ _id: userB._id });
            if (testGroup?._id) await Group.deleteOne({ _id: testGroup._id });
            if (testExpense?._id) await Expense.deleteOne({ _id: testExpense._id });
            await Payment.deleteMany({ group: testGroup?._id });
        } catch (ignore) {}

        await mongoose.connection.close();
    }, 15000);

    // 1. Create expense with equal splits
    it("1. Creates expense and calculates mathematically accurate splits across group members", async () => {
        const res = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${tokenUserA}`)
            .send({
                title: "Dinner & Drinks",
                amount: 75.00,
                category: "Food",
                groupId: testGroup._id.toString(),
                splitType: "equal"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.expense.splits.length).toBe(2);

        testExpense = res.body.expense;

        // Split amounts should sum to 75.00
        const totalSplitAmount = testExpense.splits.reduce((sum, s) => sum + s.amount, 0);
        expect(Number(totalSplitAmount.toFixed(2))).toBe(75.00);

        // Member B split should be pending
        const splitB = testExpense.splits.find(s => s.userId === userB._id.toString());
        expect(splitB).toBeDefined();
        expect(splitB.amount).toBe(37.50);
        expect(splitB.status).toBe("pending");
    });

    // 2. Member reviews and approves their own split
    it("2. Member B reviews and approves their individual share", async () => {
        const res = await request(app)
            .patch(`/api/expenses/${testExpense.id}/splits/approve`)
            .set("Authorization", `Bearer ${tokenUserB}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.split.status).toBe("approved");
        expect(res.body.split.approvedAt).toBeDefined();
    });

    // 3. User cannot approve another member's split
    it("3. User cannot approve a split for an expense they do not belong to", async () => {
        const nonMemberId = new mongoose.Types.ObjectId();
        const nonMemberToken = jwt.sign({ userId: nonMemberId.toString() }, secret, { expiresIn: "1h" });

        const res = await request(app)
            .patch(`/api/expenses/${testExpense.id}/splits/approve`)
            .set("Authorization", `Bearer ${nonMemberToken}`);

        expect(res.statusCode).toBe(401); // User does not exist in DB
    });

    // 4. Create payment order deriving amount strictly from split
    it("4. Creates PayPal checkout order with derived split amount (ignoring client amount)", async () => {
        const res = await request(app)
            .post("/api/payments/create-order")
            .set("Authorization", `Bearer ${tokenUserB}`)
            .send({
                expenseId: testExpense.id,
                amount: 0.01 // Tampered client amount should be ignored!
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.amount).toBe(37.50); // Derived from DB split!
        expect(res.body.orderId).toBeDefined();
        expect(res.body.approvalURL).toBeDefined();

        // Check payment record created in MongoDB
        const paymentRecord = await Payment.findOne({ paypalOrderId: res.body.orderId });
        expect(paymentRecord).toBeDefined();
        expect(paymentRecord.amount).toBe(37.50);
        expect(paymentRecord.expense.toString()).toBe(testExpense.id);
        expect(paymentRecord.user.toString()).toBe(userB._id.toString());
        expect(paymentRecord.status).toBe("pending");
        paypalOrderId = res.body.orderId;
    });

    // 5. Group contributions reflect member splits
    it("5. GET /api/groups/:id/contributions returns member splits & pending amounts", async () => {
        const res = await request(app)
            .get(`/api/groups/${testGroup._id}/contributions`)
            .set("Authorization", `Bearer ${tokenUserA}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.totalExpenses).toBe(75.00);

        const memberBContribution = res.body.contributions.find(c => c.userId === userB._id.toString());
        expect(memberBContribution).toBeDefined();
        expect(memberBContribution.pendingAmount).toBe(37.50);
        expect(memberBContribution.splits.length).toBeGreaterThan(0);
    });

    // 6. Capture payment order and verify split is marked as "paid"
    it("6. Captures verified PayPal payment and atomically updates Expense split to 'paid'", async () => {
        const res = await request(app)
            .post(`/api/payments/${paypalOrderId}/capture`)
            .set("Authorization", `Bearer ${tokenUserB}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.record.status).toBe("captured");

        // Verify in DB that Expense split status is now "paid"
        const updatedExpense = await Expense.findById(testExpense.id);
        const splitB = updatedExpense.splits.find(s => s.user.toString() === userB._id.toString());
        expect(splitB.status).toBe("paid");
        expect(splitB.paidAt).toBeDefined();
    });

    // 7. Prevent paying an already paid split
    it("7. Rejects creating a duplicate payment order for an already paid split", async () => {
        const res = await request(app)
            .post("/api/payments/create-order")
            .set("Authorization", `Bearer ${tokenUserB}`)
            .send({
                expenseId: testExpense.id
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain("already been paid");
    });
});
