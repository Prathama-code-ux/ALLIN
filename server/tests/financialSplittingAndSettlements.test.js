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
import Settlement from "../src/models/settlement.js";
import Transaction from "../src/models/transaction.js";
import { paypalService } from "../src/services/paypal.service.js";

describe("ALLIN Complete Financial System: Pool vs Personal Advances & Settlements", () => {
    let userA, userB, userC;
    let tokenA, tokenB, tokenC;
    let testGroup;
    const unique = Date.now();
    const secret = process.env.JWT_SECRET || "allin_default_super_secret_jwt_key_2026";

    beforeAll(async () => {
        await connectDB();

        userA = await User.create({
            name: "Member A",
            email: `usera.${unique}@allin.io`,
            passwordHash: "hash123"
        });
        userB = await User.create({
            name: "Member B",
            email: `userb.${unique}@allin.io`,
            passwordHash: "hash123"
        });
        userC = await User.create({
            name: "Member C",
            email: `userc.${unique}@allin.io`,
            passwordHash: "hash123"
        });

        tokenA = jwt.sign({ userId: userA._id.toString() }, secret, { expiresIn: "1h" });
        tokenB = jwt.sign({ userId: userB._id.toString() }, secret, { expiresIn: "1h" });
        tokenC = jwt.sign({ userId: userC._id.toString() }, secret, { expiresIn: "1h" });

        testGroup = await Group.create({
            name: "Fintech Test Group",
            description: "Testing financial separation",
            targetAmount: 300,
            poolBalance: 0,
            collectedAmount: 0,
            createdBy: userA._id,
            members: [userA._id, userB._id, userC._id],
            inviteCode: `FIN${unique.toString().slice(-4)}`
        });

        // Mock PayPal SDK methods
        jest.spyOn(paypalService, "createOrder").mockImplementation(async (amount, currency, customId, description) => ({
            id: `ORDER-${Date.now()}`,
            status: "CREATED",
            links: [
                {
                    rel: "approve",
                    href: `https://www.sandbox.paypal.com/checkoutnow?token=ORDER-${Date.now()}`
                }
            ]
        }));

        jest.spyOn(paypalService, "captureOrder").mockImplementation(async (orderId) => {
            const p = await Payment.findOne({ paypalOrderId: orderId });
            const amountVal = p ? Number(p.amount).toFixed(2) : "50.00";
            return {
                id: `CAPTURE-${orderId}`,
                status: "COMPLETED",
                purchase_units: [
                    {
                        payments: {
                            captures: [
                                {
                                    id: `CAPTURE-${orderId}`,
                                    amount: { value: amountVal, currency_code: "USD" },
                                    status: "COMPLETED"
                                }
                            ]
                        }
                    }
                ],
                payer: {
                    name: { given_name: "Fintech", surname: "Tester" },
                    email_address: `tester.${unique}@allin.io`
                }
            };
        });
    }, 20000);

    afterAll(async () => {
        try {
            const userIds = [userA?._id, userB?._id, userC?._id].filter(Boolean);
            if (userIds.length > 0) await User.deleteMany({ _id: { $in: userIds } });
            if (testGroup?._id) {
                await Group.deleteOne({ _id: testGroup._id });
                await Expense.deleteMany({ group: testGroup._id });
                await Payment.deleteMany({ group: testGroup._id });
                await Settlement.deleteMany({ group: testGroup._id });
                await Transaction.deleteMany({ group: testGroup._id });
            }
        } catch (ignore) {}
        await mongoose.connection.close();
    }, 15000);

    // 1. Pending contribution does not increase pool balance
    it("1. Pending contribution does not increase pool balance", async () => {
        const orderRes = await request(app)
            .post("/api/payments/create-order")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                groupId: testGroup._id.toString(),
                amount: 100.0,
                purpose: "GROUP_CONTRIBUTION"
            });

        expect(orderRes.statusCode).toBe(200);
        expect(orderRes.body.approvalURL).toBeDefined();

        const contribRes = await request(app)
            .get(`/api/groups/${testGroup._id}/contributions`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(contribRes.statusCode).toBe(200);
        expect(contribRes.body.totalPool).toBe(0);
        expect(contribRes.body.availablePoolBalance).toBe(0);
    });

    // 2. Successful contribution increases pool balance
    it("2. Successful contribution capture increases pool balance and confirmed contributions", async () => {
        const orderRes = await request(app)
            .post("/api/payments/create-order")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                groupId: testGroup._id.toString(),
                amount: 120.0,
                purpose: "GROUP_CONTRIBUTION"
            });

        expect(orderRes.statusCode).toBe(200);
        const orderId = orderRes.body.orderId;

        const captureRes = await request(app)
            .post(`/api/payments/${orderId}/capture`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(captureRes.statusCode).toBe(200);
        expect(captureRes.body.record.status).toBe("captured");

        const contribRes = await request(app)
            .get(`/api/groups/${testGroup._id}/contributions`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(contribRes.statusCode).toBe(200);
        expect(contribRes.body.totalConfirmedContributions).toBe(120.0);
        expect(contribRes.body.availablePoolBalance).toBe(120.0);
    });

    // 3. Failed contribution does not increase pool balance
    it("3. Failed contribution does not increase pool balance", async () => {
        await Payment.create({
            paymentPurpose: "GROUP_CONTRIBUTION",
            group: testGroup._id,
            user: userB._id,
            amount: 50.0,
            status: "failed",
            paypalOrderId: `FAILED-ORDER-${Date.now()}`
        });

        const contribRes = await request(app)
            .get(`/api/groups/${testGroup._id}/contributions`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(contribRes.body.totalConfirmedContributions).toBe(120.0);
        expect(contribRes.body.availablePoolBalance).toBe(120.0);
    });

    // 4. Group expense paid from pool decreases pool balance
    it("4. Group expense paid from pool decreases pool balance and creates no settlements", async () => {
        const expRes = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                title: "Squad Tent",
                category: "Other",
                amount: 45.0,
                groupId: testGroup._id.toString(),
                paymentSource: "pool",
                splitType: "equal"
            });

        expect(expRes.statusCode).toBe(201);
        expect(expRes.body.expense.paymentSource).toBe("pool");
        expect(expRes.body.expense.status).toBe("paid");

        // Verify pool balance decreased: 120 - 45 = 75
        const contribRes = await request(app)
            .get(`/api/groups/${testGroup._id}/contributions`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(contribRes.body.totalConfirmedContributions).toBe(120.0);
        expect(contribRes.body.poolFundedExpenses).toBe(45.0);
        expect(contribRes.body.availablePoolBalance).toBe(75.0);

        // Verify NO settlements were created for pool-funded expense
        const settlements = await Settlement.find({ expense: expRes.body.expense.id });
        expect(settlements.length).toBe(0);
    });

    // 5. Pool expense cannot exceed available balance
    it("5. Pool expense cannot exceed available balance", async () => {
        const overspendRes = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                title: "Luxury Yacht",
                category: "Travel",
                amount: 100.0, // Available is only 75.00!
                groupId: testGroup._id.toString(),
                paymentSource: "pool"
            });

        expect(overspendRes.statusCode).toBe(400);
        expect(overspendRes.body.message).toContain("Insufficient group pool balance");
    });

    // 6. Member personally pays for a group expense (Personal Advance)
    it("6. Personal advance creates reimbursement obligations for other members, excluding payer's share", async () => {
        // A pays $90 personally, split equally among A, B, C ($30 each)
        const expRes = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({
                title: "Team Feast",
                category: "Food",
                amount: 90.0,
                groupId: testGroup._id.toString(),
                paymentSource: "personal",
                splitType: "equal"
            });

        expect(expRes.statusCode).toBe(201);
        const expId = expRes.body.expense.id;

        // 90 is NOT added to group's contribution total or pool balance!
        const contribRes = await request(app)
            .get(`/api/groups/${testGroup._id}/contributions`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(contribRes.body.totalConfirmedContributions).toBe(120.0); // Unchanged!
        expect(contribRes.body.availablePoolBalance).toBe(75.0); // Unchanged!
        expect(contribRes.body.personalAdvances).toBe(90.0);

        // Check settlements created: B owes A $30, C owes A $30. A does NOT owe A!
        const settlements = await Settlement.find({ expense: expId });
        expect(settlements.length).toBe(2);

        const bSettlement = settlements.find((s) => s.debtor.toString() === userB._id.toString());
        expect(bSettlement).toBeDefined();
        expect(bSettlement.creditor.toString()).toBe(userA._id.toString());
        expect(bSettlement.amount).toBe(30.0);
        expect(bSettlement.status).toBe("pending");

        const cSettlement = settlements.find((s) => s.debtor.toString() === userC._id.toString());
        expect(cSettlement).toBeDefined();
        expect(cSettlement.creditor.toString()).toBe(userA._id.toString());
        expect(cSettlement.amount).toBe(30.0);

        // Check member ledger balances
        const memberA = contribRes.body.contributions.find((c) => c.userId === userA._id.toString());
        const memberB = contribRes.body.contributions.find((c) => c.userId === userB._id.toString());

        expect(memberA.owed).toBe(60.0); // B ($30) + C ($30)
        expect(memberA.owes).toBe(0.0);
        expect(memberB.owes).toBe(30.0);
    });

    // 7. Member reimburses their debt via PayPal
    it("7. Successful reimbursement updates settlement and creates audit transaction", async () => {
        // Find settlement where B owes A $30
        const bSettlement = await Settlement.findOne({
            debtor: userB._id,
            creditor: userA._id,
            status: "pending"
        });

        expect(bSettlement).toBeDefined();

        // B initiates PayPal reimbursement
        const orderRes = await request(app)
            .post("/api/payments/create-order")
            .set("Authorization", `Bearer ${tokenB}`)
            .send({
                settlementId: bSettlement._id.toString(),
                purpose: "REIMBURSEMENT"
            });

        expect(orderRes.statusCode).toBe(200);
        expect(orderRes.body.purpose).toBe("REIMBURSEMENT");
        expect(orderRes.body.amount).toBe(30.0);

        const orderId = orderRes.body.orderId;

        // B captures reimbursement
        const captureRes = await request(app)
            .post(`/api/payments/${orderId}/capture`)
            .set("Authorization", `Bearer ${tokenB}`);

        expect(captureRes.statusCode).toBe(200);

        // Verify settlement updated to completed
        const updatedSettlement = await Settlement.findById(bSettlement._id);
        expect(updatedSettlement.status).toBe("completed");
        expect(updatedSettlement.settledAmount).toBe(30.0);

        // Verify group pool balance is NOT affected by reimbursement
        const contribRes = await request(app)
            .get(`/api/groups/${testGroup._id}/contributions`)
            .set("Authorization", `Bearer ${tokenA}`);

        expect(contribRes.body.totalConfirmedContributions).toBe(120.0); // Unchanged!
        expect(contribRes.body.availablePoolBalance).toBe(75.0); // Unchanged!

        // B owes 0 now
        const memberB = contribRes.body.contributions.find((c) => c.userId === userB._id.toString());
        expect(memberB.owes).toBe(0.0);
    });

    // 8. Capture idempotency prevents duplicate processing
    it("8. Capture idempotency prevents duplicate settlement and balance modifications", async () => {
        // Find the completed payment from test 7
        const capturedPayment = await Payment.findOne({
            user: userB._id,
            paymentPurpose: "REIMBURSEMENT",
            status: "captured"
        });

        expect(capturedPayment).toBeDefined();

        // Send duplicate capture request
        const dupRes = await request(app)
            .post(`/api/payments/${capturedPayment.paypalOrderId}/capture`)
            .set("Authorization", `Bearer ${tokenB}`);

        expect(dupRes.statusCode).toBe(200);
        expect(dupRes.body.alreadyProcessed).toBe(true);

        // Settlement still 30, not doubled to 60!
        const settlement = await Settlement.findById(capturedPayment.settlement);
        expect(settlement.settledAmount).toBe(30.0);
    });

    // 9. Unauthorized payment rejection
    it("9. User cannot reimburse someone else's settlement", async () => {
        const cSettlement = await Settlement.findOne({
            debtor: userC._id,
            status: "pending"
        });

        // B tries to reimburse C's settlement
        const res = await request(app)
            .post("/api/payments/create-order")
            .set("Authorization", `Bearer ${tokenB}`)
            .send({
                settlementId: cSettlement._id.toString()
            });

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain("not the designated debtor");
    });
});
