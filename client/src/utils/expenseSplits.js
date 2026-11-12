export const CATEGORY_ICONS = {
  Food: "🍔",
  Transport: "🚕",
  Shopping: "🛍",
  Entertainment: "🎬",
  Bills: "📄",
  Health: "💊",
  Travel: "✈️",
  Other: "📦",
};

/**
 * Extract normalized string ID from a group member object or ObjectId string.
 */
export function getMemberId(member) {
  if (!member) return "";
  if (typeof member === "string") return member;
  return String(member._id || member.id || member.userId || "");
}

/**
 * Divide a positive USD total equally across selected member IDs with cent-level accuracy
 * so the sum of member shares equals the exact rounded total amount.
 */
export function calculateEqualSplits(totalAmount, selectedMemberIds = []) {
  const amountNum = Number(totalAmount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return {
      isValid: false,
      sharesByMember: {},
      splits: [],
      totalAssigned: 0,
      error: "Enter a valid positive expense amount first.",
    };
  }

  const ids = selectedMemberIds.filter(Boolean);
  if (ids.length === 0) {
    return {
      isValid: false,
      sharesByMember: {},
      splits: [],
      totalAssigned: 0,
      error: "Select at least one group member to split the expense.",
    };
  }

  const totalCents = Math.round(amountNum * 100);
  if (totalCents < ids.length) {
    return {
      isValid: false,
      sharesByMember: {},
      splits: [],
      totalAssigned: 0,
      error:
        "Expense total is too small to assign at least $0.01 to each selected member.",
    };
  }

  const baseCents = Math.floor(totalCents / ids.length);
  let remainderCents = totalCents - baseCents * ids.length;

  const sharesByMember = {};
  const splits = ids.map((userId) => {
    const memberCents = baseCents + (remainderCents > 0 ? 1 : 0);
    if (remainderCents > 0) remainderCents -= 1;

    const share = Number((memberCents / 100).toFixed(2));
    sharesByMember[userId] = share;
    return { userId, amount: share };
  });

  const totalAssigned = Number((totalCents / 100).toFixed(2));

  return {
    isValid: true,
    sharesByMember,
    splits,
    totalAssigned,
    error: "",
  };
}

/**
 * Generate an evenly distributed percentage map totaling 100% across selected members.
 */
export function buildEvenPercentages(selectedMemberIds = []) {
  const ids = selectedMemberIds.filter(Boolean);
  if (ids.length === 0) return {};

  const totalTenths = 1000; // 100.0% in tenths of a percent
  const baseTenths = Math.floor(totalTenths / ids.length);
  let remainder = totalTenths - baseTenths * ids.length;

  const map = {};
  ids.forEach((id) => {
    const t = baseTenths + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    map[id] = Number((t / 10).toFixed(1));
  });
  return map;
}

/**
 * Convert member percentage allocations into exact USD shares using Largest Remainder Method
 * when percentages sum to 100% (+/- 0.01% tolerance).
 */
export function calculatePercentageSplits(
  totalAmount,
  percentageByMember = {},
  selectedMemberIds = [],
) {
  const amountNum = Number(totalAmount);
  const ids = selectedMemberIds.filter(Boolean);

  if (ids.length === 0) {
    return {
      isValid: false,
      sharesByMember: {},
      splits: [],
      totalPercentage: 0,
      remainingPercentage: 100,
      totalAssigned: 0,
      error: "Select at least one group member to split by percentage.",
    };
  }

  let totalPercentage = 0;
  let invalidInputError = "";
  const entries = ids.map((userId) => {
    const rawVal = percentageByMember[userId];
    const pct =
      rawVal === "" || rawVal === undefined || rawVal === null
        ? 0
        : Number(rawVal);

    if (!Number.isFinite(pct) || pct < 0) {
      invalidInputError = "Percentages cannot be negative.";
    } else if (pct > 100) {
      invalidInputError = "Individual percentages cannot exceed 100%.";
    } else if (pct === 0 && !invalidInputError) {
      invalidInputError =
        "Every selected member must have a percentage greater than 0% (or uncheck them).";
    }

    totalPercentage += Number.isFinite(pct) ? pct : 0;
    return { userId, pct: Number.isFinite(pct) ? pct : 0 };
  });

  const roundedPctTotal = Number(totalPercentage.toFixed(2));
  const remainingPercentage = Number((100 - totalPercentage).toFixed(2));
  const pctSumValid = Math.abs(totalPercentage - 100) <= 0.01;

  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    const previewShares = {};
    ids.forEach((id) => {
      previewShares[id] = 0;
    });
    return {
      isValid: false,
      sharesByMember: previewShares,
      splits: [],
      totalPercentage: roundedPctTotal,
      remainingPercentage,
      totalAssigned: 0,
      error: "Enter a valid positive expense amount first.",
    };
  }

  const totalCents = Math.round(amountNum * 100);
  const sharesByMember = {};

  if (!invalidInputError && pctSumValid) {
    // Reconcile cents with Largest Remainder Method so sum === exact expense total
    const rawItems = entries.map((item, idx) => {
      const exactCents = (item.pct / 100) * totalCents;
      const floored = Math.floor(exactCents);
      return {
        idx,
        userId: item.userId,
        floored,
        fraction: exactCents - floored,
      };
    });

    const flooredSum = rawItems.reduce((sum, item) => sum + item.floored, 0);
    let centsToDistribute = totalCents - flooredSum;

    if (centsToDistribute > 0) {
      const ranked = [...rawItems].sort(
        (a, b) => b.fraction - a.fraction || a.idx - b.idx,
      );
      for (let i = 0; i < ranked.length && centsToDistribute > 0; i++) {
        rawItems[ranked[i].idx].floored += 1;
        centsToDistribute -= 1;
      }
    } else if (centsToDistribute < 0) {
      const ranked = [...rawItems].sort(
        (a, b) => a.fraction - b.fraction || a.idx - b.idx,
      );
      for (let i = 0; i < ranked.length && centsToDistribute < 0; i++) {
        if (rawItems[ranked[i].idx].floored > 1) {
          rawItems[ranked[i].idx].floored -= 1;
          centsToDistribute += 1;
        }
      }
    }

    let hasZeroCentsShare = false;
    rawItems.forEach((item) => {
      if (item.floored <= 0) hasZeroCentsShare = true;
      sharesByMember[item.userId] = Number((item.floored / 100).toFixed(2));
    });

    const totalAssigned = Number((totalCents / 100).toFixed(2));
    const splits = ids.map((userId) => ({
      userId,
      amount: sharesByMember[userId],
    }));

    if (hasZeroCentsShare) {
      return {
        isValid: false,
        sharesByMember,
        splits: [],
        totalPercentage: roundedPctTotal,
        remainingPercentage,
        totalAssigned,
        error:
          "Each selected member's calculated share must be at least $0.01.",
      };
    }

    return {
      isValid: true,
      sharesByMember,
      splits,
      totalPercentage: roundedPctTotal,
      remainingPercentage: 0,
      totalAssigned,
      error: "",
    };
  }

  // Preview unvalidated shares live while user adjusts percentages
  let assignedSum = 0;
  entries.forEach(({ userId, pct }) => {
    const share = Number(((pct / 100) * amountNum).toFixed(2));
    sharesByMember[userId] = share;
    assignedSum += share;
  });

  const error =
    invalidInputError ||
    `Percentages must total 100% (currently ${roundedPctTotal.toFixed(1)}%).`;

  return {
    isValid: false,
    sharesByMember,
    splits: [],
    totalPercentage: roundedPctTotal,
    remainingPercentage,
    totalAssigned: Number(assignedSum.toFixed(2)),
    error,
  };
}

/**
 * Validate fixed USD amount allocations against total expense amount.
 */
export function validateFixedSplits(
  totalAmount,
  amountByMember = {},
  selectedMemberIds = [],
) {
  const amountNum = Number(totalAmount);
  const roundedTotal = Number.isFinite(amountNum)
    ? Number(amountNum.toFixed(2))
    : 0;
  const ids = selectedMemberIds.filter(Boolean);

  if (ids.length === 0) {
    return {
      isValid: false,
      sharesByMember: {},
      splits: [],
      totalAssigned: 0,
      remainingAmount: roundedTotal,
      error: "Select at least one group member to assign fixed amounts.",
    };
  }

  let totalAssigned = 0;
  let invalidError = "";
  const sharesByMember = {};

  ids.forEach((userId) => {
    const rawVal = amountByMember[userId];
    const amt =
      rawVal === "" || rawVal === undefined || rawVal === null
        ? 0
        : Number(rawVal);

    if (!Number.isFinite(amt) || amt < 0) {
      invalidError = "Member split amounts cannot be negative.";
      sharesByMember[userId] = 0;
      return;
    }

    if (roundedTotal > 0 && amt > roundedTotal + 0.009) {
      invalidError = "No member share can exceed the total expense amount.";
    } else if (amt <= 0 && !invalidError) {
      invalidError =
        "Every selected member must have an amount greater than $0.00 (or uncheck them).";
    }

    const fixedShare = Number(amt.toFixed(2));
    sharesByMember[userId] = fixedShare;
    totalAssigned += fixedShare;
  });

  totalAssigned = Number(totalAssigned.toFixed(2));
  const remainingAmount = Number((roundedTotal - totalAssigned).toFixed(2));

  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return {
      isValid: false,
      sharesByMember,
      splits: [],
      totalAssigned,
      remainingAmount: 0,
      error: "Enter a valid positive expense amount first.",
    };
  }

  const exactMatch = Math.abs(remainingAmount) <= 0.009;
  const error =
    invalidError ||
    (!exactMatch
      ? remainingAmount > 0
        ? `$${remainingAmount.toFixed(2)} left unallocated — assigned amounts must equal $${roundedTotal.toFixed(2)}.`
        : `Assigned amounts exceed the total by $${Math.abs(remainingAmount).toFixed(2)}.`
      : "");

  const isValid = !invalidError && exactMatch;
  const splits = isValid
    ? ids.map((userId) => ({ userId, amount: sharesByMember[userId] }))
    : [];

  return {
    isValid,
    sharesByMember,
    splits,
    totalAssigned,
    remainingAmount,
    error,
  };
}

/**
 * Compute Spending Analysis summary and descending category breakdown.
 * Category percentage is ALWAYS: (categoryAmount / totalExpenses) * 100.
 */
export function computeSpendingStats(expenses = []) {
  const list = Array.isArray(expenses) ? expenses : [];
  const count = list.length;

  let totalExpenses = 0;
  const map = {};

  list.forEach((exp) => {
    const amt = Number(exp?.amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return;

    totalExpenses += amt;
    const category = exp?.category || "Other";

    if (!map[category]) {
      map[category] = {
        name: category,
        icon: CATEGORY_ICONS[category] || "📌",
        amount: 0,
        count: 0,
      };
    }
    map[category].amount += amt;
    map[category].count += 1;
  });

  totalExpenses = Number(totalExpenses.toFixed(2));

  const categoriesBreakdown = Object.values(map)
    .map((entry) => {
      const amount = Number(entry.amount.toFixed(2));
      const percentage =
        totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;

      return {
        ...entry,
        amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoriesBreakdown[0] || null;
  const topCategoryPercentage = topCategory ? topCategory.percentage : 0;

  return {
    totalExpenses,
    count,
    topCategory,
    topCategoryPercentage,
    categoriesBreakdown,
  };
}
