import mongoose from "mongoose";
import Settlement from "../models/settlement.js";
import Group from "../models/Group.js";

// Get user settlements (debts owed to others and credits owed to user)
export const getMySettlements = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, status } = req.query;

    const baseFilter = {};
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ success: false, message: "Invalid group ID" });
      }
      baseFilter.group = groupId;
    }
    if (status) {
      baseFilter.status = status;
    }

    const debtsFilter = { ...baseFilter, debtor: userId };
    const creditsFilter = { ...baseFilter, creditor: userId };

    const [debts, credits] = await Promise.all([
      Settlement.find(debtsFilter)
        .populate("creditor", "name email")
        .populate("debtor", "name email")
        .populate("group", "name")
        .populate("expense", "title category amount date")
        .sort({ createdAt: -1 }),
      Settlement.find(creditsFilter)
        .populate("creditor", "name email")
        .populate("debtor", "name email")
        .populate("group", "name")
        .populate("expense", "title category amount date")
        .sort({ createdAt: -1 })
    ]);

    const formatSettlement = (s) => {
      const remainingAmount = Math.max(0, Number((s.amount - (s.settledAmount || 0)).toFixed(2)));
      return {
        id: s._id,
        _id: s._id,
        groupId: s.group?._id || s.group,
        groupName: s.group?.name || "Group",
        expenseId: s.expense?._id || s.expense,
        expenseTitle: s.expense?.title || null,
        debtor: {
          id: s.debtor?._id || s.debtor,
          name: s.debtor?.name || "Member",
          email: s.debtor?.email
        },
        creditor: {
          id: s.creditor?._id || s.creditor,
          name: s.creditor?.name || "Member",
          email: s.creditor?.email
        },
        amount: Number(s.amount.toFixed(2)),
        settledAmount: Number((s.settledAmount || 0).toFixed(2)),
        remainingAmount,
        currency: s.currency || "USD",
        status: s.status,
        settledAt: s.settledAt,
        createdAt: s.createdAt
      };
    };

    const formattedDebts = debts.map(formatSettlement);
    const formattedCredits = credits.map(formatSettlement);

    const totalOwed = formattedDebts
      .filter((s) => s.status !== "completed")
      .reduce((sum, s) => sum + s.remainingAmount, 0);

    const totalOwedToUser = formattedCredits
      .filter((s) => s.status !== "completed")
      .reduce((sum, s) => sum + s.remainingAmount, 0);

    return res.status(200).json({
      success: true,
      debts: formattedDebts,
      credits: formattedCredits,
      summary: {
        totalOwed: Number(totalOwed.toFixed(2)),
        totalOwedToUser: Number(totalOwedToUser.toFixed(2)),
        netBalance: Number((totalOwedToUser - totalOwed).toFixed(2))
      }
    });
  } catch (error) {
    console.error("Get settlements error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve settlements"
    });
  }
};

// Get single settlement by ID
export const getSettlementById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid settlement ID" });
    }

    const settlement = await Settlement.findById(id)
      .populate("creditor", "name email")
      .populate("debtor", "name email")
      .populate("group", "name")
      .populate("expense", "title category amount date");

    if (!settlement) {
      return res.status(404).json({ success: false, message: "Settlement not found" });
    }

    const userId = req.user._id;
    const isDebtor = settlement.debtor?._id?.equals(userId) || settlement.debtor?.equals?.(userId);
    const isCreditor = settlement.creditor?._id?.equals(userId) || settlement.creditor?.equals?.(userId);

    if (!isDebtor && !isCreditor) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this settlement" });
    }

    const remainingAmount = Math.max(0, Number((settlement.amount - (settlement.settledAmount || 0)).toFixed(2)));

    return res.status(200).json({
      success: true,
      settlement: {
        id: settlement._id,
        _id: settlement._id,
        groupId: settlement.group?._id,
        groupName: settlement.group?.name,
        expenseId: settlement.expense?._id,
        expenseTitle: settlement.expense?.title,
        debtor: {
          id: settlement.debtor?._id,
          name: settlement.debtor?.name,
          email: settlement.debtor?.email
        },
        creditor: {
          id: settlement.creditor?._id,
          name: settlement.creditor?.name,
          email: settlement.creditor?.email
        },
        amount: Number(settlement.amount.toFixed(2)),
        settledAmount: Number((settlement.settledAmount || 0).toFixed(2)),
        remainingAmount,
        currency: settlement.currency || "USD",
        status: settlement.status,
        settledAt: settlement.settledAt,
        createdAt: settlement.createdAt
      }
    });
  } catch (error) {
    console.error("Get settlement by ID error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve settlement"
    });
  }
};
