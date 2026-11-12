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

/**
 * Pure integer-cent proportional distributor using the Largest Remainder Method.
 * Guarantees the distributed integer cents sum exactly to `totalCents`.
 */
function distributeProportionalCents(totalCents, weightsById, orderedIds) {
  const result = {};
  orderedIds.forEach((id) => {
    result[id] = 0;
  });

  if (totalCents <= 0 || orderedIds.length === 0) {
    return result;
  }

  const active = orderedIds
    .map((id, idx) => ({ id, idx, weight: Math.max(0, Math.round(weightsById[id] || 0)) }))
    .filter((entry) => entry.weight > 0);

  const totalWeight = active.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return result;
  }

  let allocated = 0;
  const rows = active.map((entry) => {
    const numerator = totalCents * entry.weight;
    const floored = Math.floor(numerator / totalWeight);
    const remainder = numerator % totalWeight;
    allocated += floored;
    return { ...entry, floored, remainder };
  });

  let remainingCents = totalCents - allocated;
  const ranked = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.idx - b.idx,
  );

  for (let i = 0; i < ranked.length && remainingCents > 0; i++) {
    ranked[i].floored += 1;
    remainingCents -= 1;
  }

  rows.forEach((row) => {
    // `ranked` mutated the shared row objects' `floored` property
    result[row.id] = row.floored;
  });

  return result;
}

/**
 * Calculate deterministic, cent-exact member splits from itemized receipt entries,
 * proportionally allocating discounts, tax, and tip across assigned items so the
 * sum of all member shares equals the final receipt total to the exact penny.
 */
export function calculateItemizedReceiptSplits({
  items = [],
  tax = 0,
  tip = 0,
  discount = 0,
  memberOrder = [],
} = {}) {
  const list = Array.isArray(items) ? items : [];

  const parseChargeCents = (raw, label) => {
    if (raw === "" || raw === null || raw === undefined) {
      return { cents: 0, error: "" };
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      return { cents: 0, error: `${label} cannot be negative.` };
    }
    return { cents: Math.round(num * 100), error: "" };
  };

  const taxParsed = parseChargeCents(tax, "Tax");
  const tipParsed = parseChargeCents(tip, "Tip");
  const discountParsed = parseChargeCents(discount, "Discount");

  const taxCents = taxParsed.cents;
  const tipCents = tipParsed.cents;
  const discountCents = discountParsed.cents;

  // Establish deterministic member ordering
  const orderedMemberIds = [];
  const seenOrder = new Set();
  (Array.isArray(memberOrder) ? memberOrder : []).forEach((id) => {
    const key = String(id || "");
    if (key && !seenOrder.has(key)) {
      seenOrder.add(key);
      orderedMemberIds.push(key);
    }
  });
  list.forEach((item) => {
    (Array.isArray(item?.assignedMemberIds) ? item.assignedMemberIds : []).forEach((id) => {
      const key = String(id || "");
      if (key && !seenOrder.has(key)) {
        seenOrder.add(key);
        orderedMemberIds.push(key);
      }
    });
  });

  let validationError =
    taxParsed.error || tipParsed.error || discountParsed.error || "";

  if (list.length === 0 && !validationError) {
    validationError = "Add or extract at least one receipt item to split.";
  }

  let itemsSubtotalCents = 0;
  const itemsCentsByMember = {};
  orderedMemberIds.forEach((id) => {
    itemsCentsByMember[id] = 0;
  });

  const unassignedItemIds = [];
  const invalidItemIds = [];

  list.forEach((item, index) => {
    const itemId = item?.id ?? `item-${index}`;
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const rawAmount = Number(item?.amount);
    const itemCents = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) : 0;

    if (!name || !Number.isFinite(rawAmount) || itemCents <= 0) {
      invalidItemIds.push(itemId);
      if (!validationError) {
        validationError = !name
          ? "Every receipt item must have a name."
          : "Every receipt item must have an amount greater than $0.00.";
      }
    }

    if (Number.isFinite(rawAmount) && itemCents > 0) {
      itemsSubtotalCents += itemCents;
    }

    const rawAssigned = Array.isArray(item?.assignedMemberIds)
      ? item.assignedMemberIds.map((id) => String(id || "")).filter(Boolean)
      : [];
    const uniqueAssignedSet = new Set(rawAssigned);
    const assignedIds = orderedMemberIds.filter((id) => uniqueAssignedSet.has(id));

    if (assignedIds.length === 0) {
      unassignedItemIds.push(itemId);
      return;
    }

    if (itemCents > 0) {
      const base = Math.floor(itemCents / assignedIds.length);
      let rem = itemCents - base * assignedIds.length;
      assignedIds.forEach((memberId) => {
        const shareCents = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem -= 1;
        itemsCentsByMember[memberId] = (itemsCentsByMember[memberId] || 0) + shareCents;
      });
    }
  });

  if (!validationError && unassignedItemIds.length > 0) {
    validationError =
      unassignedItemIds.length === 1
        ? "Assign the highlighted receipt item to at least one group member."
        : `Assign all ${unassignedItemIds.length} unassigned receipt items to at least one group member.`;
  }

  if (!validationError && discountCents > itemsSubtotalCents) {
    validationError = `Discount ($${(discountCents / 100).toFixed(2)}) cannot exceed items subtotal ($${(itemsSubtotalCents / 100).toFixed(2)}).`;
  }

  const finalTotalCents = Math.max(
    0,
    itemsSubtotalCents - discountCents + taxCents + tipCents,
  );

  if (!validationError && finalTotalCents <= 0) {
    validationError = "Final receipt total must be greater than $0.00.";
  }

  // Compute proportional breakdown even for partial previews when items are assigned
  const assignedSubtotalCents = Object.values(itemsCentsByMember).reduce(
    (sum, c) => sum + c,
    0,
  );
  const canAllocateCharges =
    assignedSubtotalCents > 0 &&
    unassignedItemIds.length === 0 &&
    discountCents <= itemsSubtotalCents;

  const discountCentsByMember = canAllocateCharges
    ? distributeProportionalCents(discountCents, itemsCentsByMember, orderedMemberIds)
    : {};

  const netSubtotalCentsByMember = {};
  orderedMemberIds.forEach((id) => {
    const itemShare = itemsCentsByMember[id] || 0;
    const discShare = discountCentsByMember[id] || 0;
    netSubtotalCentsByMember[id] = Math.max(0, itemShare - discShare);
  });

  const netTotalWeight = Object.values(netSubtotalCentsByMember).reduce(
    (sum, c) => sum + c,
    0,
  );
  const taxTipWeights =
    netTotalWeight > 0 ? netSubtotalCentsByMember : itemsCentsByMember;

  const taxCentsByMember = canAllocateCharges
    ? distributeProportionalCents(taxCents, taxTipWeights, orderedMemberIds)
    : {};
  const tipCentsByMember = canAllocateCharges
    ? distributeProportionalCents(tipCents, taxTipWeights, orderedMemberIds)
    : {};

  const memberBreakdown = {};
  const sharesByMember = {};
  const splits = [];

  orderedMemberIds.forEach((id) => {
    const itemShareCents = itemsCentsByMember[id] || 0;
    const discountShareCents = discountCentsByMember[id] || 0;
    const taxShareCents = taxCentsByMember[id] || 0;
    const tipShareCents = tipCentsByMember[id] || 0;
    const totalShareCents =
      itemShareCents - discountShareCents + taxShareCents + tipShareCents;

    memberBreakdown[id] = {
      userId: id,
      itemsAmount: Number((itemShareCents / 100).toFixed(2)),
      discountAmount: Number((discountShareCents / 100).toFixed(2)),
      taxAmount: Number((taxShareCents / 100).toFixed(2)),
      tipAmount: Number((tipShareCents / 100).toFixed(2)),
      totalAmount: Number((totalShareCents / 100).toFixed(2)),
      totalCents: totalShareCents,
    };

    const dollarShare = Number((totalShareCents / 100).toFixed(2));
    sharesByMember[id] = dollarShare;

    if (totalShareCents > 0) {
      splits.push({ userId: id, amount: dollarShare });
    }
  });

  const allocatedTotalCents = splits.reduce(
    (sum, s) => sum + Math.round(s.amount * 100),
    0,
  );

  const isValid =
    !validationError &&
    unassignedItemIds.length === 0 &&
    invalidItemIds.length === 0 &&
    finalTotalCents > 0 &&
    splits.length > 0 &&
    allocatedTotalCents === finalTotalCents;

  return {
    isValid,
    error: validationError,
    itemsSubtotal: Number((itemsSubtotalCents / 100).toFixed(2)),
    discountAmount: Number((discountCents / 100).toFixed(2)),
    taxAmount: Number((taxCents / 100).toFixed(2)),
    tipAmount: Number((tipCents / 100).toFixed(2)),
    finalTotal: Number((finalTotalCents / 100).toFixed(2)),
    finalTotalCents,
    allocatedTotal: Number((allocatedTotalCents / 100).toFixed(2)),
    unassignedItemIds,
    invalidItemIds,
    memberBreakdown,
    sharesByMember,
    splits: isValid ? splits : [],
  };
}

/**
 * Format a clean, auditable summary description for an itemized receipt expense.
 */
export function buildReceiptDescription({
  merchantName = "",
  items = [],
  tax = 0,
  tip = 0,
  discount = 0,
  finalTotal = 0,
  currency = null,
} = {}) {
  const parts = [];
  if (merchantName) {
    parts.push(`Receipt from ${merchantName}`);
  }
  if (Array.isArray(items) && items.length > 0) {
    const itemSummary = items
      .slice(0, 12)
      .map((item) => `${item.name} ($${Number(item.amount || 0).toFixed(2)})`)
      .join(", ");
    const extra = items.length > 12 ? ` +${items.length - 12} more` : "";
    parts.push(`Items: ${itemSummary}${extra}`);
  }
  const charges = [];
  if (Number(discount) > 0) charges.push(`Discount -$${Number(discount).toFixed(2)}`);
  if (Number(tax) > 0) charges.push(`Tax $${Number(tax).toFixed(2)}`);
  if (Number(tip) > 0) charges.push(`Tip $${Number(tip).toFixed(2)}`);
  if (charges.length > 0) {
    parts.push(charges.join(" | "));
  }
  if (currency && currency !== "USD") {
    parts.push(`Original receipt currency: ${currency}`);
  }
  parts.push(`Total: $${Number(finalTotal || 0).toFixed(2)} USD`);
  return parts.join(" • ");
}
