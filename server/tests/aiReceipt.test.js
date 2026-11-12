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
import { geminiService } from "../src/services/gemini.service.js";
import { paypalService } from "../src/services/paypal.service.js";
import { receiptScanRateLimiter } from "../src/routes/aiRoutes.js";

// Minimal valid image header buffers (> 12 bytes) for magic-byte verification
const VALID_PNG_BASE64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
]).toString("base64");

const VALID_JPEG_BASE64 = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01,
]).toString("base64");

describe("AI Receipt Scanner & Itemized Expense Workflow", () => {
  let userA;
  let userB;
  let outsiderUser;
  let tokenA;
  let tokenB;
  let tokenOutsider;
  let activeGroup;
  let closedGroup;

  const unique = Date.now();
  const secret =
    process.env.JWT_SECRET || "allin_default_super_secret_jwt_key_2026";
  const createdExpenseIds = [];
  const createdPaymentOrderIds = [];

  beforeAll(async () => {
    await connectDB();

    userA = await User.create({
      name: "Receipt Owner",
      email: `receipt.owner.${unique}@allin.io`,
      passwordHash: "hash123",
    });
    userB = await User.create({
      name: "Receipt Friend",
      email: `receipt.friend.${unique}@allin.io`,
      passwordHash: "hash123",
    });
    outsiderUser = await User.create({
      name: "Receipt Outsider",
      email: `receipt.outsider.${unique}@allin.io`,
      passwordHash: "hash123",
    });

    tokenA = jwt.sign({ userId: userA._id.toString() }, secret, {
      expiresIn: "1h",
    });
    tokenB = jwt.sign({ userId: userB._id.toString() }, secret, {
      expiresIn: "1h",
    });
    tokenOutsider = jwt.sign({ userId: outsiderUser._id.toString() }, secret, {
      expiresIn: "1h",
    });

    activeGroup = await Group.create({
      name: "AI Receipt Dinner Crew",
      description: "Receipt scan test group",
      targetAmount: 300,
      createdBy: userA._id,
      members: [userA._id, userB._id],
      inviteCode: `AI${unique.toString().slice(-6)}`,
    });

    closedGroup = await Group.create({
      name: "Closed AI Group",
      description: "Closed group check",
      targetAmount: 100,
      status: "closed",
      createdBy: userA._id,
      members: [userA._id, userB._id],
      inviteCode: `AIC${unique.toString().slice(-5)}`,
    });
  }, 20000);

  beforeEach(() => {
    receiptScanRateLimiter.reset();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    try {
      if (createdPaymentOrderIds.length > 0) {
        await Payment.deleteMany({
          paypalOrderId: { $in: createdPaymentOrderIds },
        });
      }
      if (createdExpenseIds.length > 0) {
        await Expense.deleteMany({ _id: { $in: createdExpenseIds } });
      }
      const groupIds = [activeGroup?._id, closedGroup?._id].filter(Boolean);
      if (groupIds.length > 0) {
        await Group.deleteMany({ _id: { $in: groupIds } });
      }
      const userIds = [userA?._id, userB?._id, outsiderUser?._id].filter(Boolean);
      if (userIds.length > 0) {
        await User.deleteMany({ _id: { $in: userIds } });
      }
    } catch {
      // ignore cleanup errors
    }
    await mongoose.connection.close();
  }, 15000);

  it("1. Rejects unauthenticated receipt scan requests with 401", async () => {
    const res = await request(app).post("/api/ai/parse-receipt").send({
      imageBase64: VALID_PNG_BASE64,
      mimeType: "image/png",
    });
    expect(res.statusCode).toBe(401);
  });

  it("2. Enforces MIME type, magic bytes, and 5 MB image size limits", async () => {
    const badMime = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: VALID_PNG_BASE64,
        mimeType: "application/pdf",
      });
    expect(badMime.statusCode).toBe(400);

    const spoofedBytes = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: Buffer.from("not-really-a-png-file-at-all").toString("base64"),
        mimeType: "image/png",
      });
    expect(spoofedBytes.statusCode).toBe(400);
    expect(spoofedBytes.body.message).toMatch(/do not match/i);

    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 32, 0x00);
    oversizedBuffer[0] = 0x89;
    oversizedBuffer[1] = 0x50;
    oversizedBuffer[2] = 0x4e;
    oversizedBuffer[3] = 0x47;
    oversizedBuffer[4] = 0x0d;
    oversizedBuffer[5] = 0x0a;
    oversizedBuffer[6] = 0x1a;
    oversizedBuffer[7] = 0x0a;

    const oversized = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: oversizedBuffer.toString("base64"),
        mimeType: "image/png",
      });
    expect(oversized.statusCode).toBe(413);
  });

  it("3. Enforces group membership and active status checks", async () => {
    const outsiderRes = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenOutsider}`)
      .send({
        imageBase64: VALID_PNG_BASE64,
        mimeType: "image/png",
        groupId: activeGroup._id.toString(),
      });
    expect(outsiderRes.statusCode).toBe(403);

    const closedRes = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: VALID_PNG_BASE64,
        mimeType: "image/png",
        groupId: closedGroup._id.toString(),
      });
    expect(closedRes.statusCode).toBe(400);
  });

  it("4. Validates Gemini JSON without inventing missing fields and handles unclear images cleanly", async () => {
    const geminiSpy = jest
      .spyOn(geminiService, "extractReceiptData")
      .mockResolvedValueOnce(
        JSON.stringify({
          isReceipt: true,
          merchantName: "Harbor Bistro",
          receiptDate: null,
          currency: "usd",
          suggestedCategory: "Food",
          items: [
            { name: "Pasta", quantity: 1, unitPrice: 18, totalPrice: 18 },
            { name: "Tacos", quantity: 2, unitPrice: 6, totalPrice: 12 },
          ],
          subtotal: 30,
          tax: 3,
          tip: null,
          discount: -2,
          total: 31,
          confidenceNotes: [],
        }),
      );

    const res = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: VALID_JPEG_BASE64,
        mimeType: "image/jpg",
        groupId: activeGroup._id.toString(),
      });

    expect(res.statusCode).toBe(200);
    expect(geminiSpy).toHaveBeenCalledTimes(1);
    expect(res.body.receipt.merchantName).toBe("Harbor Bistro");
    expect(res.body.receipt.receiptDate).toBeNull();
    expect(res.body.receipt.tip).toBeNull();
    expect(res.body.receipt.discount).toBe(2);
    expect(res.body.receipt.currency).toBe("USD");
    expect(res.body.receipt.items).toHaveLength(2);
    expect(res.body.receipt.diagnostics.hasTotalMismatch).toBe(false);

    // Blurry / non-receipt rejection
    geminiSpy.mockResolvedValueOnce(
      JSON.stringify({
        isReceipt: false,
        unreadableReason: "Image is too blurry to read line items.",
        items: [],
        confidenceNotes: [],
      }),
    );

    const unclearRes = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: VALID_PNG_BASE64,
        mimeType: "image/png",
      });
    expect(unclearRes.statusCode).toBe(422);
    expect(unclearRes.body.message).toMatch(/blurry/i);

    // Malformed AI JSON rejection
    geminiSpy.mockResolvedValueOnce("not-valid-json{{{");
    const malformedRes = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: VALID_PNG_BASE64,
        mimeType: "image/png",
      });
    expect(malformedRes.statusCode).toBe(502);
  });

  it("5. Rate limits excessive receipt scan calls per user", async () => {
    jest.spyOn(geminiService, "extractReceiptData").mockResolvedValue(
      JSON.stringify({
        isReceipt: true,
        merchantName: "Cafe",
        items: [{ name: "Latte", totalPrice: 5 }],
        total: 5,
        confidenceNotes: [],
      }),
    );

    const maxAllowed = Number(process.env.AI_RATE_LIMIT_PER_MIN || 12);
    for (let i = 0; i < maxAllowed; i++) {
      const okRes = await request(app)
        .post("/api/ai/parse-receipt")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          imageBase64: VALID_PNG_BASE64,
          mimeType: "image/png",
        });
      expect(okRes.statusCode).toBe(200);
    }

    const limitedRes = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: VALID_PNG_BASE64,
        mimeType: "image/png",
      });
    expect(limitedRes.statusCode).toBe(429);
    expect(limitedRes.headers["retry-after"]).toBeDefined();
  });

  it("6. Saves receipt splits via POST /api/expenses and preserves split approval & PayPal order creation", async () => {
    jest.spyOn(geminiService, "extractReceiptData").mockResolvedValueOnce(
      JSON.stringify({
        isReceipt: true,
        merchantName: "Ocean Diner",
        receiptDate: "2026-11-10",
        currency: "USD",
        suggestedCategory: "Food",
        items: [
          { name: "Burger", quantity: 1, unitPrice: 15, totalPrice: 15 },
          { name: "Fries", quantity: 1, unitPrice: 5, totalPrice: 5 },
        ],
        subtotal: 20,
        tax: 2,
        tip: 4,
        discount: null,
        total: 26,
        confidenceNotes: [],
      }),
    );

    const scanRes = await request(app)
      .post("/api/ai/parse-receipt")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        imageBase64: VALID_PNG_BASE64,
        mimeType: "image/png",
        groupId: activeGroup._id.toString(),
      });
    expect(scanRes.statusCode).toBe(200);

    // Deterministic splits: A takes Burger ($15), A & B share Fries ($2.50 each) => $17.50 / $2.50
    // Tax ($2) + Tip ($4) = $6 split 17.5/20 = $5.25 for A, 2.5/20 = $0.75 for B => A=$22.75, B=$3.25
    const createExpenseRes = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: scanRes.body.receipt.merchantName,
        category: scanRes.body.receipt.suggestedCategory,
        amount: 26.0,
        date: scanRes.body.receipt.receiptDate,
        description: "Receipt from Ocean Diner",
        groupId: activeGroup._id.toString(),
        splitType: "custom",
        splits: [
          { userId: userA._id.toString(), amount: 22.75 },
          { userId: userB._id.toString(), amount: 3.25 },
        ],
      });

    expect(createExpenseRes.statusCode).toBe(201);
    const createdExpense = createExpenseRes.body.expense;
    createdExpenseIds.push(createdExpense._id);
    expect(createdExpense.amount).toBe(26);
    expect(createdExpense.splitType).toBe("custom");

    // Member B approves their split
    const approveRes = await request(app)
      .patch(`/api/expenses/${createdExpense._id}/splits/approve`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.body.split.status).toBe("approved");

    // Member B initiates PayPal checkout; server derives $3.25 strictly from split
    const orderId = `MOCK-AI-ORDER-${Date.now()}`;
    createdPaymentOrderIds.push(orderId);
    jest.spyOn(paypalService, "createOrder").mockResolvedValueOnce({
      id: orderId,
      status: "CREATED",
      links: [
        {
          rel: "approve",
          href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
        },
      ],
    });

    const orderRes = await request(app)
      .post("/api/payments/create-order")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        expenseId: createdExpense._id,
        groupId: activeGroup._id.toString(),
        amount: 999.99, // Attempted tamper must be ignored in favor of split ($3.25)
      });

    expect(orderRes.statusCode).toBe(200);
    expect(orderRes.body.amount).toBe(3.25);
  });
});

