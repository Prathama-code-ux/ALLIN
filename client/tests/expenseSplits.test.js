import test from "node:test";
import assert from "node:assert/strict";
import { formatUSD, validatePositiveAmount } from "../src/utils/currency.js";
import {
  calculateEqualSplits,
  calculatePercentageSplits,
  validateFixedSplits,
  computeSpendingStats,
  buildEvenPercentages,
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

