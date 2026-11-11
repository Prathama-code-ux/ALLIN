import mongoose from "mongoose";
import crypto from "crypto";
import Group from "../models/Group.js";
import Payment from "../models/payment.js";
import Expense from "../models/expense.js";
import User from "../models/User.js";

export const createGroup = async (req, res) => {
    try {
        const { name, description, targetAmount } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Group name is required"
            });
        }

        const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

        const group = await Group.create({
            name: name.trim(),
            description: (description || "").trim(),
            targetAmount: targetAmount && !isNaN(targetAmount) ? Number(targetAmount) : 200,
            createdBy: req.user._id,
            members: [req.user._id],
            inviteCode
        });

        return res.status(201).json({
            message: "Group created successfully",
            group: {
                id: group._id,
                _id: group._id,
                name: group.name,
                description: group.description,
                targetAmount: group.targetAmount,
                createdBy: group.createdBy,
                members: group.members,
                inviteCode: group.inviteCode
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

        // If user has no groups, create an initial "ALLIN Squad" workspace group automatically
        if (groups.length === 0) {
            const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
            const defaultGroup = await Group.create({
                name: "ALLIN Squad",
                description: "Collaborative payment crew",
                targetAmount: 200,
                createdBy: req.user._id,
                members: [req.user._id],
                inviteCode
            });

            groups = [await Group.findById(defaultGroup._id)
                .populate("createdBy", "name email")
                .populate("members", "name email")];
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

        const alreadyMember = group.members.some(
            memberId => memberId.equals(req.user._id)
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

        const isMember = group.members.some(
            member => member._id.equals(req.user._id)
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

// Calculate group contributions dynamically from DB payments and expense splits
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

        const targetAmount = Number(group.targetAmount || 200);
        const memberCount = Math.max(group.members.length, 1);
        const perMemberTarget = targetAmount / memberCount;

        // Fetch completed payments for this group
        const payments = await Payment.find({
            group: group._id,
            status: "captured"
        });

        // Fetch group expenses with splits
        const groupExpenses = await Expense.find({ group: group._id });

        // Group payments by user
        const paymentSums = {};
        let totalPool = 0;

        payments.forEach(p => {
            const uid = p.user ? String(p.user) : "unassigned";
            paymentSums[uid] = (paymentSums[uid] || 0) + Number(p.amount);
            totalPool += Number(p.amount);
        });

        // Group expense splits by member
        const memberSplits = {};
        let totalExpensesAmount = 0;

        groupExpenses.forEach(exp => {
            totalExpensesAmount += Number(exp.amount || 0);
            (exp.splits || []).forEach(s => {
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
                    paidAt: s.paidAt
                });
            });
        });

        const contributions = group.members.map(member => {
            const uid = String(member._id);
            const userPaid = paymentSums[uid] || 0;
            const splits = memberSplits[uid] || [];
            const userOwedFromSplits = splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);
            const pendingSplits = splits.filter(s => s.status !== "paid");
            const pendingAmount = pendingSplits.reduce((sum, s) => sum + Number(s.amount || 0), 0);

            // Default share: if member has pending splits, show pending splits; otherwise show equal share
            const defaultShare = userOwedFromSplits > 0
                ? (pendingAmount > 0 ? pendingAmount : userOwedFromSplits)
                : (userPaid > 0 ? userPaid : perMemberTarget);

            const percentage = targetAmount > 0
                ? Math.min(Math.round((userPaid / targetAmount) * 100), 100)
                : 0;

            const isAdmin = group.createdBy._id.equals(member._id);

            const initials = (member.name || "U")
                .split(" ")
                .map(n => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

            // Status: COMPLETED if no pending splits and has contributed, otherwise PENDING
            const isCompleted = userOwedFromSplits > 0
                ? pendingSplits.length === 0 && userPaid > 0
                : userPaid > 0;

            return {
                id: member._id,
                userId: member._id,
                name: member.name,
                initials,
                role: isAdmin ? "Admin" : "Member",
                amount: Number(defaultShare.toFixed(2)),
                paidAmount: Number(userPaid.toFixed(2)),
                totalOwed: Number(userOwedFromSplits.toFixed(2)),
                pendingAmount: Number(pendingAmount.toFixed(2)),
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
            totalPool: Number(totalPool.toFixed(2)),
            remaining: Math.max(0, Number((targetAmount - totalPool).toFixed(2))),
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

        // Do not close while a payment is still in progress.
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

        // Count only verified paid expense splits.
        const expenses = await Expense.find({
            group: group._id,
            deletedAt: null
        });

        const collectedAmount = expenses.reduce((total, expense) => {
            const paidSplits = (expense.splits || [])
                .filter(split => split.status === "paid");

            return total + paidSplits.reduce(
                (sum, split) => sum + Number(split.amount || 0),
                0
            );
        }, 0);

        const targetAmount = Number(group.targetAmount || 0);

        if (collectedAmount + 0.01 < targetAmount) {
            return res.status(400).json({
                success: false,
                message: "The group collection target has not been reached",
                targetAmount,
                collectedAmount: Number(collectedAmount.toFixed(2)),
                remaining: Number(
                    Math.max(0, targetAmount - collectedAmount).toFixed(2)
                )
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
