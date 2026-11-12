import mongoose from "mongoose";
import crypto from "crypto";
import Group from "../models/Group.js";
import Payment from "../models/payment.js";
import Expense from "../models/expense.js";
import Settlement from "../models/settlement.js";
import User from "../models/User.js";

export const createGroup = async (req, res) => {
    try {
        const { name, description, targetAmount } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Group name is required"
            });
        }

        const hasTargetValue =
            targetAmount !== undefined &&
            targetAmount !== null &&
            String(targetAmount).trim() !== "";
        const parsedTarget = Number(targetAmount);

        if (!hasTargetValue || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
            return res.status(400).json({
                message: "A valid positive target amount (USD) is required"
            });
        }

        const normalizedTarget = Number(parsedTarget.toFixed(2));
        const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

        const group = await Group.create({
            name: name.trim(),
            description: (description || "").trim(),
            targetAmount: normalizedTarget,
            poolBalance: 0,
            collectedAmount: 0,
            createdBy: req.user._id,
            members: [req.user._id],
            inviteCode
        });

        const populatedGroup = await Group.findById(group._id)
            .populate("createdBy", "name email")
            .populate("members", "name email");

        return res.status(201).json({
            message: "Group created successfully",
            group: {
                id: populatedGroup._id,
                _id: populatedGroup._id,
                name: populatedGroup.name,
                description: populatedGroup.description,
                targetAmount: populatedGroup.targetAmount,
                poolBalance: populatedGroup.poolBalance || 0,
                status: populatedGroup.status,
                createdBy: populatedGroup.createdBy,
                members: populatedGroup.members,
                inviteCode: populatedGroup.inviteCode
            }
        });
    } catch (error) {
        console.error("Create group error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const getMyGroups = async (req, res) => {
    try {
        let groups = await Group.find({
            members: req.user._id,
            deletedAt: null
        })
            .populate("createdBy", "name email")
            .populate("members", "name email");

        if (groups.length === 0) {
            const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
            const defaultGroup = await Group.create({
                name: "ALLIN Squad",
                description: "Collaborative payment crew",
                targetAmount: 200,
                poolBalance: 0,
                collectedAmount: 0,
                createdBy: req.user._id,
                members: [req.user._id],
                inviteCode
            });

            groups = [
                await Group.findById(defaultGroup._id)
                    .populate("createdBy", "name email")
                    .populate("members", "name email")
            ];
        }

        return res.status(200).json({
            count: groups.length,
            groups
        });
    } catch (error) {
        console.error("Get groups error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const joinGroup = async (req, res) => {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode || !inviteCode.trim()) {
            return res.status(400).json({
                message: "Invite code is required"
            });
        }

        const group = await Group.findOne({
            inviteCode: inviteCode.trim().toUpperCase(),
            deletedAt: null,
            status: "active"
        });

        if (!group) {
            return res.status(404).json({
                message: "Invalid invite code"
            });
        }

        const alreadyMember = group.members.some((memberId) =>
            memberId.equals(req.user._id)
        );

        if (alreadyMember) {
            return res.status(409).json({
                message: "You are already a member of this group"
            });
        }

        group.members.push(req.user._id);
        await group.save();

        return res.status(200).json({
            message: "Joined group successfully",
            group
        });
    } catch (error) {
        console.error("Join group error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid group ID"
            });
        }

        const group = await Group.findOne({
            _id: id,
            deletedAt: null
        })
            .populate("createdBy", "name email")
            .populate("members", "name email");

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const isMember = group.members.some((member) =>
            member._id.equals(req.user._id)
        );

        if (!isMember) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        return res.status(200).json({
            group
        });
    } catch (error) {
        console.error("Get group error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Calculate group ledger: confirmed pool contributions, pool balance, personal advances, settlements, member balances
export const getGroupContributions = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid group ID"
            });
        }

        const group = await Group.findOne({
            _id: id,
            deletedAt: null
        })
            .populate("createdBy", "name email")
            .populate("members", "name email");

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const parsedGroupTarget = Number(group.targetAmount);
        const targetAmount = Number.isFinite(parsedGroupTarget) ? parsedGroupTarget : 0;
        const memberCount = Math.max(group.members.length, 1);
        const perMemberTarget = targetAmount / memberCount;

        // 1. Fetch confirmed group contributions (money deposited into shared group pool)
        // Only confirmed GROUP_CONTRIBUTION payments count toward target and pool!
        const confirmedContributions = await Payment.find({
            group: group._id,
            status: "captured",
            paymentPurpose: { $in: ["GROUP_CONTRIBUTION", null] },
            expense: null,
            settlement: null
        });

        // Sum contributions by member and total
        const memberDeposits = {};
        let totalConfirmedContributions = 0;

        confirmedContributions.forEach((p) => {
            const uid = p.user ? String(p.user) : "unassigned";
            const amt = Number(p.amount || 0);
            memberDeposits[uid] = (memberDeposits[uid] || 0) + amt;
            totalConfirmedContributions += amt;
        });

        // 2. Fetch active group expenses
        const groupExpenses = await Expense.find({
            group: group._id,
            deletedAt: null
        }).populate("paidBy", "name email");

        let totalExpensesAmount = 0;
        let totalPoolFundedExpenses = 0;
        let totalPersonalAdvances = 0;
        const memberSplits = {};
        const memberPersonalPaid = {};

        groupExpenses.forEach((exp) => {
            const expAmt = Number(exp.amount || 0);
            totalExpensesAmount += expAmt;

            if (exp.paymentSource === "pool") {
                totalPoolFundedExpenses += expAmt;
            } else {
                totalPersonalAdvances += expAmt;
                const payerId = exp.paidBy?._id ? String(exp.paidBy._id) : String(exp.paidBy);
                memberPersonalPaid[payerId] = (memberPersonalPaid[payerId] || 0) + expAmt;
            }

            (exp.splits || []).forEach((s) => {
                const uid = String(s.user);
                if (!memberSplits[uid]) {
                    memberSplits[uid] = [];
                }
                memberSplits[uid].push({
                    expenseId: exp._id,
                    expenseTitle: exp.title,
                    amount: s.amount,
                    status: s.status,
                    approvedAt: s.approvedAt,
                    paidAt: s.paidAt,
                    paymentSource: exp.paymentSource || "personal"
                });
            });
        });

        // Available Pool Balance = Confirmed Group Contributions - Pool-Funded Expenses
        const availablePoolBalance = Math.max(
            0,
            Number((totalConfirmedContributions - totalPoolFundedExpenses).toFixed(2))
        );

        // 3. Fetch all active settlements for this group
        const settlements = await Settlement.find({
            group: group._id
        }).populate("debtor", "name email").populate("creditor", "name email");

        const memberOwes = {};
        const memberOwed = {};

        settlements.forEach((s) => {
            if (s.status !== "completed") {
                const remaining = Math.max(0, Number((s.amount - (s.settledAmount || 0)).toFixed(2)));
                const debtorId = s.debtor?._id ? String(s.debtor._id) : String(s.debtor);
                const creditorId = s.creditor?._id ? String(s.creditor._id) : String(s.creditor);

                memberOwes[debtorId] = (memberOwes[debtorId] || 0) + remaining;
                memberOwed[creditorId] = (memberOwed[creditorId] || 0) + remaining;
            }
        });

        // 4. Construct Member Details
        const contributions = group.members.map((member) => {
            const uid = String(member._id);
            const userDeposited = memberDeposits[uid] || 0;
            const userPersonalPaid = memberPersonalPaid[uid] || 0;
            const splits = memberSplits[uid] || [];
            const userAllocatedShare = splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);

            const pendingSplits = splits.filter((s) => s.status !== "paid");
            const pendingAmount = pendingSplits.reduce((sum, s) => sum + Number(s.amount || 0), 0);

            const userOwes = Number((memberOwes[uid] || 0).toFixed(2));
            const userOwed = Number((memberOwed[uid] || 0).toFixed(2));
            const netBalance = Number((userOwed - userOwes).toFixed(2));

            // Default share for display/paying: pending debt or equal share
            const defaultShare = userOwes > 0
                ? userOwes
                : pendingAmount > 0
                ? pendingAmount
                : userDeposited > 0
                ? userDeposited
                : perMemberTarget;

            const percentage = targetAmount > 0
                ? Math.min(Math.round((userDeposited / targetAmount) * 100), 100)
                : 0;

            const isAdmin = group.createdBy._id.equals(member._id);
            const initials = (member.name || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

            // Status is COMPLETED if member has no pending debts and has paid share or deposited
            const isCompleted = userOwes === 0 && (pendingSplits.length === 0 || userDeposited > 0);

            return {
                id: member._id,
                userId: member._id,
                name: member.name,
                email: member.email,
                initials,
                role: isAdmin ? "Admin" : "Member",
                amount: Number(defaultShare.toFixed(2)),
                paidAmount: Number(userDeposited.toFixed(2)),
                userDeposited: Number(userDeposited.toFixed(2)),
                personallyPaid: Number(userPersonalPaid.toFixed(2)),
                totalOwed: Number(userAllocatedShare.toFixed(2)),
                allocatedShare: Number(userAllocatedShare.toFixed(2)),
                pendingAmount: Number(pendingAmount.toFixed(2)),
                owes: userOwes,
                owed: userOwed,
                netBalance,
                percentage,
                status: isCompleted ? "COMPLETED" : "PENDING",
                splits,
                pendingSplits
            };
        });

        return res.status(200).json({
            success: true,
            groupId: group._id,
            groupName: group.name,
            targetAmount,
            // totalPool represents total confirmed deposits collected toward the target
            totalPool: Number(totalConfirmedContributions.toFixed(2)),
            totalConfirmedContributions: Number(totalConfirmedContributions.toFixed(2)),
            availablePoolBalance,
            poolFundedExpenses: Number(totalPoolFundedExpenses.toFixed(2)),
            personalAdvances: Number(totalPersonalAdvances.toFixed(2)),
            remaining: Math.max(0, Number((targetAmount - totalConfirmedContributions).toFixed(2))),
            totalExpenses: Number(totalExpensesAmount.toFixed(2)),
            contributions
        });
    } catch (error) {
        console.error("Get group contributions error:", error);
        return res.status(500).json({
            message: "Failed to calculate contributions"
        });
    }
};

export const closeGroup = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID"
            });
        }

        const group = await Group.findOne({
            _id: id,
            deletedAt: null
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        if (!group.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Only the group admin can close this group"
            });
        }

        if (group.status === "closed") {
            return res.status(400).json({
                success: false,
                message: "This group is already closed"
            });
        }

        const inFlightPayment = await Payment.findOne({
            group: group._id,
            status: { $in: ["pending", "approved", "authorized"] }
        });

        if (inFlightPayment) {
            return res.status(409).json({
                success: false,
                message: "Cannot close the group while payments are pending or processing"
            });
        }

        // Count confirmed contributions
        const confirmedPayments = await Payment.find({
            group: group._id,
            status: "captured",
            paymentPurpose: { $in: ["GROUP_CONTRIBUTION", null] },
            expense: null,
            settlement: null
        });

        const collectedAmount = confirmedPayments.reduce(
            (sum, p) => sum + Number(p.amount || 0),
            0
        );

        const targetAmount = Number(group.targetAmount || 0);

        if (collectedAmount + 0.01 < targetAmount) {
            return res.status(400).json({
                success: false,
                message: "The group collection target has not been reached",
                targetAmount,
                collectedAmount: Number(collectedAmount.toFixed(2)),
                remaining: Number(Math.max(0, targetAmount - collectedAmount).toFixed(2))
            });
        }

        group.status = "closed";
        group.closedAt = new Date();
        group.closedBy = req.user._id;

        await group.save();

        return res.status(200).json({
            success: true,
            message: "Group closed successfully",
            group: {
                _id: group._id,
                name: group.name,
                status: group.status,
                targetAmount,
                collectedAmount: Number(collectedAmount.toFixed(2)),
                closedAt: group.closedAt
            }
        });
    } catch (error) {
        console.error("Close group error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to close group"
        });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID"
            });
        }

        const group = await Group.findOne({
            _id: id,
            deletedAt: null
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        if (!group.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Only the group admin can delete this group"
            });
        }

        const inFlightPayment = await Payment.findOne({
            group: group._id,
            status: { $in: ["pending", "approved", "authorized"] }
        });

        if (inFlightPayment) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete a group while payments are pending or processing"
            });
        }

        group.deletedAt = new Date();
        group.deletedBy = req.user._id;

        await group.save();

        return res.status(200).json({
            success: true,
            message: "Group deleted successfully"
        });
    } catch (error) {
        console.error("Delete group error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete group"
        });
    }
};
