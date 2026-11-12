import test from "node:test";
import assert from "node:assert/strict";
import { formatUSD, validatePositiveAmount } from "../src/utils/currency.js";
import {
  calculateEqualSplits,
  calculatePercentageSplits,
  validateFixedSplits,
  computeSpendingStats,
  buildEvenPercentages,
  calculateItemizedReceiptSplits,
  buildReceiptDescription,
} from "../src/utils/expenseSplits.js";

test("formatUSD formats positive, zero, and negative USD amounts consistently", () => {
  assert.equal(formatUSD(0), "$0.00");
  assert.equal(formatUSD(129.15), "$129.15");
  assert.equal(formatUSD("45.5"), "$45.50");
  assert.equal(formatUSD(-12.3), "-$12.30");
  assert.equal(formatUSD(NaN), "$0.00");
});

test("validatePositiveAmount rejects missing, zero, negative, and non-numeric inputs", () => {
  assert.equal(validatePositiveAmount("", "Target").valid, false);
  assert.equal(validatePositiveAmount("0", "Target").valid, false);
  assert.equal(validatePositiveAmount(-50, "Target").valid, false);
  assert.equal(validatePositiveAmount("abc", "Target").valid, false);

  const validRes = validatePositiveAmount("475.5", "Target");
  assert.equal(validRes.valid, true);
  assert.equal(validRes.value, 475.5);
});

test("calculateEqualSplits distributes remainder cents accurately so sum === total", () => {
  const res3 = calculateEqualSplits(100, ["u1", "u2", "u3"]);
  assert.equal(res3.isValid, true);
  assert.deepEqual(res3.sharesByMember, { u1: 33.34, u2: 33.33, u3: 33.33 });
  const sum3 = res3.splits.reduce((s, item) => s + item.amount, 0);
  assert.equal(Number(sum3.toFixed(2)), 100.0);

  const resOdd = calculateEqualSplits(10.01, ["u1", "u2"]);
  assert.equal(resOdd.isValid, true);
  assert.deepEqual(resOdd.sharesByMember, { u1: 5.01, u2: 5.0 });

  const resTooSmall = calculateEqualSplits(0.02, ["u1", "u2", "u3"]);
  assert.equal(resTooSmall.isValid, false);
});

test("calculatePercentageSplits converts percentages to exact USD shares and enforces 100% total", () => {
  const evenPct = buildEvenPercentages(["u1", "u2", "u3"]);
  assert.deepEqual(evenPct, { u1: 33.4, u2: 33.3, u3: 33.3 });

  const res = calculatePercentageSplits(10.01, { u1: 50, u2: 50 }, ["u1", "u2"]);
  assert.equal(res.isValid, true);
  assert.equal(Number((res.sharesByMember.u1 + res.sharesByMember.u2).toFixed(2)), 10.01);

  const res3 = calculatePercentageSplits(
    100,
    { u1: 33.33, u2: 33.33, u3: 33.34 },
    ["u1", "u2", "u3"],
  );
  assert.equal(res3.isValid, true);
  const sum = res3.splits.reduce((acc, s) => acc + s.amount, 0);
  assert.equal(Number(sum.toFixed(2)), 100.0);

  // Small tolerance accepted
  const resTol = calculatePercentageSplits(
    100,
    { u1: 50, u2: 50.005 },
    ["u1", "u2"],
  );
  assert.equal(resTol.isValid, true);

  // Rejects sum != 100%, negative values, and zero values on selected members
  assert.equal(
    calculatePercentageSplits(100, { u1: 40, u2: 50 }, ["u1", "u2"]).isValid,
    false,
  );
  assert.equal(
    calculatePercentageSplits(100, { u1: -10, u2: 110 }, ["u1", "u2"]).isValid,
    false,
  );
  assert.equal(
    calculatePercentageSplits(100, { u1: 0, u2: 100 }, ["u1", "u2"]).isValid,
    false,
  );
});

test("validateFixedSplits validates exact sum, unallocated remainder, and negative/over-total bounds", () => {
  const valid = validateFixedSplits(120, { u1: "75.25", u2: "44.75" }, ["u1", "u2"]);
  assert.equal(valid.isValid, true);
  assert.equal(valid.remainingAmount, 0);
  assert.deepEqual(valid.sharesByMember, { u1: 75.25, u2: 44.75 });

  const under = validateFixedSplits(120, { u1: "70", u2: "30" }, ["u1", "u2"]);
  assert.equal(under.isValid, false);
  assert.equal(under.remainingAmount, 20);
  assert.match(under.error, /\$20\.00 left unallocated/);

  const over = validateFixedSplits(100, { u1: "80", u2: "30" }, ["u1", "u2"]);
  assert.equal(over.isValid, false);
  assert.equal(over.remainingAmount, -10);

  const negative = validateFixedSplits(100, { u1: "-5", u2: "105" }, ["u1", "u2"]);
  assert.equal(negative.isValid, false);
});

test("computeSpendingStats calculates category percentages relative to total spending and sorts descending", () => {
  const emptyStats = computeSpendingStats([]);
  assert.equal(emptyStats.totalExpenses, 0);
  assert.equal(emptyStats.count, 0);
  assert.equal(emptyStats.topCategory, null);
  assert.equal(emptyStats.topCategoryPercentage, 0);
  assert.equal(emptyStats.categoriesBreakdown.length, 0);

  const stats = computeSpendingStats([
    { title: "Flight", category: "Travel", amount: 25 },
    { title: "Dinner", category: "Food", amount: 50 },
    { title: "Lunch", category: "Food", amount: 25 },
  ]);

  assert.equal(stats.totalExpenses, 100);
  assert.equal(stats.count, 3);
  assert.equal(stats.topCategory.name, "Food");
  assert.equal(stats.topCategory.amount, 75);
  // 75 / 100 * 100 = 75%, Travel = 25 / 100 * 100 = 25% (NOT 33.3% relative to Food)
  assert.equal(stats.topCategoryPercentage, 75);
  assert.equal(stats.categoriesBreakdown[0].name, "Food");
  assert.equal(stats.categoriesBreakdown[0].percentage, 75);
  assert.equal(stats.categoriesBreakdown[1].name, "Travel");
  assert.equal(stats.categoriesBreakdown[1].percentage, 25);
});

test("calculateItemizedReceiptSplits divides shared items, discount, tax, and tip with exact cent accuracy", () => {
  const res = calculateItemizedReceiptSplits({
    items: [
      { id: "i1", name: "Pasta", amount: 20, assignedMemberIds: ["u1"] },
      { id: "i2", name: "Shared Pizza", amount: 10, assignedMemberIds: ["u1", "u2", "u3"] },
    ],
    discount: 3,
    tax: 2.7,
    tip: 5.4,
    memberOrder: ["u1", "u2", "u3"],
  });

  assert.equal(res.isValid, true);
  assert.equal(res.itemsSubtotal, 30);
  assert.equal(res.discountAmount, 3);
  assert.equal(res.taxAmount, 2.7);
  assert.equal(res.tipAmount, 5.4);
  assert.equal(res.finalTotal, 35.1);
  assert.equal(res.allocatedTotal, 35.1);

  const splitSumCents = res.splits.reduce((sum, s) => sum + Math.round(s.amount * 100), 0);
  assert.equal(splitSumCents, Math.round(res.finalTotal * 100));
  assert.ok(res.memberBreakdown.u1.totalAmount > res.memberBreakdown.u2.totalAmount);
});

test("calculateItemizedReceiptSplits preserves exact penny sum under tricky remainders and excludes 0-share members", () => {
  const res = calculateItemizedReceiptSplits({
    items: [
      { id: "i1", name: "Steak", amount: 17.33, assignedMemberIds: ["u1", "u2"] },
      { id: "i2", name: "Salad", amount: 9.19, assignedMemberIds: ["u2", "u3"] },
    ],
    discount: 1.07,
    tax: 2.13,
    tip: 4.55,
    memberOrder: ["u1", "u2", "u3", "u4"], // u4 did not share anything
  });

  assert.equal(res.isValid, true);
  assert.equal(res.finalTotal, 32.13);
  assert.equal(res.splits.length, 3);
  assert.equal(res.sharesByMember.u4, 0);

  const sum = res.splits.reduce((acc, s) => acc + Math.round(s.amount * 100), 0);
  assert.equal(sum, 3213);
});

test("calculateItemizedReceiptSplits rejects unassigned items, over-discount, and invalid item prices", () => {
  const unassigned = calculateItemizedReceiptSplits({
    items: [{ id: "i1", name: "Coffee", amount: 5, assignedMemberIds: [] }],
    memberOrder: ["u1", "u2"],
  });
  assert.equal(unassigned.isValid, false);
  assert.deepEqual(unassigned.unassignedItemIds, ["i1"]);

  const overDiscount = calculateItemizedReceiptSplits({
    items: [{ id: "i1", name: "Coffee", amount: 5, assignedMemberIds: ["u1"] }],
    discount: 6,
    memberOrder: ["u1"],
  });
  assert.equal(overDiscount.isValid, false);
  assert.match(overDiscount.error, /cannot exceed items subtotal/i);

  const badPrice = calculateItemizedReceiptSplits({
    items: [{ id: "i1", name: "Coffee", amount: 0, assignedMemberIds: ["u1"] }],
    memberOrder: ["u1"],
  });
  assert.equal(badPrice.isValid, false);
});

test("buildReceiptDescription formats clear receipt audit summary", () => {
  const desc = buildReceiptDescription({
    merchantName: "Harbor Grill",
    items: [
      { name: "Tacos", amount: 14 },
      { name: "Soda", amount: 3.5 },
    ],
    tax: 1.5,
    tip: 3,
    discount: 1,
    finalTotal: 21,
    currency: "USD",
  });
  assert.match(desc, /Harbor Grill/);
  assert.match(desc, /Tacos \(\$14\.00\)/);
  assert.match(desc, /Total: \$21\.00 USD/);
});

