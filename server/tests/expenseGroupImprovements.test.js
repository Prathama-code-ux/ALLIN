import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import Group from "../src/models/Group.js";
import Expense from "../src/models/expense.js";

describe("ALLIN Group Targets, USD Standardization & Expense Splitting API", () => {
  let userA;
  let userB;
  let userC;
  let tokenA;
  let tokenB;
  const createdGroupIds = [];
  const createdExpenseIds = [];
  const unique = Date.now();
  const secret =
    process.env.JWT_SECRET || "allin_default_super_secret_jwt_key_2026";

  beforeAll(async () => {
    await connectDB();

    userA = await User.create({
      name: "Alice USD",
      email: `alice.usd.${unique}@allin.io`,
      passwordHash: "hash123",
    });
    userB = await User.create({
      name: "Bob USD",
      email: `bob.usd.${unique}@allin.io`,
      passwordHash: "hash123",
    });
    userC = await User.create({
      name: "Charlie USD",
      email: `charlie.usd.${unique}@allin.io`,
      passwordHash: "hash123",
    });

    tokenA = jwt.sign({ userId: userA._id.toString() }, secret, {
      expiresIn: "1h",
    });
    tokenB = jwt.sign({ userId: userB._id.toString() }, secret, {
      expiresIn: "1h",
    });
  }, 20000);

  afterAll(async () => {
    try {
      if (createdExpenseIds.length > 0) {
        await Expense.deleteMany({ _id: { $in: createdExpenseIds } });
      }
      if (createdGroupIds.length > 0) {
        await Group.deleteMany({ _id: { $in: createdGroupIds } });
      }
      const userIds = [userA?._id, userB?._id, userC?._id].filter(Boolean);
      if (userIds.length > 0) {
        await User.deleteMany({ _id: { $in: userIds } });
      }
    } catch {
      // ignore cleanup failures
    }
    await mongoose.connection.close();
  }, 15000);

  it("1. Rejects missing or non-positive group targetAmount instead of silently defaulting to 200", async () => {
    const missingRes = await request(app)
      .post("/api/groups")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "No Target Group" });
    expect(missingRes.statusCode).toBe(400);

    const zeroRes = await request(app)
      .post("/api/groups")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Zero Target Group", targetAmount: 0 });
    expect(zeroRes.statusCode).toBe(400);

    const negRes = await request(app)
      .post("/api/groups")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Negative Target Group", targetAmount: -50 });
    expect(negRes.statusCode).toBe(400);
  });

  it("2. Retains custom targetAmounts across multiple groups independently", async () => {
    const res1 = await request(app)
      .post("/api/groups")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Crew Alpha", targetAmount: 475.5 });
    expect(res1.statusCode).toBe(201);
    expect(res1.body.group.targetAmount).toBe(475.5);
    expect(Array.isArray(res1.body.group.members)).toBe(true);
    expect(res1.body.group.members[0].name).toBe("Alice USD");
    createdGroupIds.push(res1.body.group._id);

    const res2 = await request(app)
      .post("/api/groups")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Crew Beta", targetAmount: 120 });
    expect(res2.statusCode).toBe(201);
    expect(res2.body.group.targetAmount).toBe(120);
    createdGroupIds.push(res2.body.group._id);

    // Join second and third members to Crew Alpha
    await Group.updateOne(
      { _id: res1.body.group._id },
      { $addToSet: { members: { $each: [userB._id, userC._id] } } },
    );

    const listRes = await request(app)
      .get("/api/groups")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(listRes.statusCode).toBe(200);

    const fetched1 = listRes.body.groups.find(
      (g) => g._id === res1.body.group._id,
    );
    const fetched2 = listRes.body.groups.find(
      (g) => g._id === res2.body.group._id,
    );
    expect(fetched1.targetAmount).toBe(475.5);
    expect(fetched2.targetAmount).toBe(120);

    const contribRes = await request(app)
      .get(`/api/groups/${res2.body.group._id}/contributions`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(contribRes.statusCode).toBe(200);
    expect(contribRes.body.targetAmount).toBe(120);
  });

  it("3. Stores new expenses in USD and distributes equal splits with exact cent rounding", async () => {
    const groupId = createdGroupIds[0];
    const res = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Team Lunch",
        category: "Food",
        amount: 100.0,
        groupId,
        splitType: "equal",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.expense.currency).toBe("USD");
    expect(res.body.expense.paidBy).toBe("Alice USD");
    expect(res.body.expense.splits.length).toBe(3);

    const sum = res.body.expense.splits.reduce((s, item) => s + item.amount, 0);
    expect(Number(sum.toFixed(2))).toBe(100.0);
    createdExpenseIds.push(res.body.expense._id);
  });

  it("4. Supports subset equal split and custom/percentage splits while rejecting mismatched or spoofing splits", async () => {
    const groupId = createdGroupIds[0];

    // Subset equal split (2 out of 3 members)
    const subsetRes = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Two-Person Cab",
        category: "Transport",
        amount: 45.01,
        groupId,
        splitType: "equal",
        splits: [
          { userId: userA._id.toString(), amount: 22.51 },
          { userId: userB._id.toString(), amount: 22.5 },
        ],
      });
    expect(subsetRes.statusCode).toBe(201);
    expect(subsetRes.body.expense.splits.length).toBe(2);
    createdExpenseIds.push(subsetRes.body.expense._id);

    // Custom fixed / calculated percentage split
    const customRes = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Suite Booking",
        category: "Travel",
        amount: 200.0,
        groupId,
        splitType: "custom",
        splits: [
          { userId: userA._id.toString(), amount: 120.0 },
          { userId: userB._id.toString(), amount: 50.0, status: "paid" }, // spoofed status must NOT persist as paid
          { userId: userC._id.toString(), amount: 30.0 },
        ],
      });
    expect(customRes.statusCode).toBe(201);
    const bobSplit = customRes.body.expense.splits.find(
      (s) => s.userId === userB._id.toString(),
    );
    expect(bobSplit.status).toBe("pending");
    createdExpenseIds.push(customRes.body.expense._id);

    // Invalid mismatched custom split rejected with USD error message
    const badRes = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Bad Split",
        category: "Other",
        amount: 100.0,
        groupId,
        splitType: "custom",
        splits: [
          { userId: userA._id.toString(), amount: 50.0 },
          { userId: userB._id.toString(), amount: 40.0 },
        ],
      });
    expect(badRes.statusCode).toBe(400);
    expect(badRes.body.message).toContain("$");
  });

  it("5. Updates expense splits cleanly, handles non-existent ID with 404, and reads legacy INR expenses without altering them", async () => {
    const expenseId = createdExpenseIds[0];
    const updateRes = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Team Lunch Updated",
        amount: 90.0,
        splitType: "custom",
        splits: [
          { userId: userA._id.toString(), amount: 45.0 },
          { userId: userB._id.toString(), amount: 45.0 },
        ],
      });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.expense.title).toBe("Team Lunch Updated");
    expect(updateRes.body.expense.splits.length).toBe(2);
    expect(updateRes.body.expense.paidBy).toBe("Alice USD");

    const missingId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request(app)
      .put(`/api/expenses/${missingId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Nope" });
    expect(notFoundRes.statusCode).toBe(404);

    // Legacy INR record preserved intact
    const legacy = await Expense.create({
      title: "Legacy INR Record",
      category: "Food",
      amount: 500,
      totalAmount: 500,
      currency: "INR",
      paidBy: userA._id,
      group: createdGroupIds[0],
      splitType: "none",
      splits: [],
    });
    createdExpenseIds.push(legacy._id);

    const fetchRes = await request(app)
      .get("/api/expenses")
      .set("Authorization", `Bearer ${tokenB}`)
      .query({ groupId: createdGroupIds[0] });
    expect(fetchRes.statusCode).toBe(200);
    const fetchedLegacy = fetchRes.body.expenses.find(
      (e) => e._id === legacy._id.toString(),
    );
    expect(fetchedLegacy.currency).toBe("INR");
    expect(fetchedLegacy.amount).toBe(500);
  });
});

