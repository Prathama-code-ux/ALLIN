import Expense from "../models/expense.js";
import Group from "../models/Group.js";
import mongoose from "mongoose";
import Payment from "../models/payment.js";

const VALID_CATEGORIES = [
    "Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Travel", "Other"
];

const formatExpenseResponse = (e) => ({
    id: e._id,
    _id: e._id,
    title: e.title,
    category: e.category,
    amount: e.amount,
    currency: e.currency || "USD",
    totalAmount: e.totalAmount ?? e.amount,
    date: e.date,
    description: e.description,
    paidBy: e.paidBy?.name || null,
    paidById: e.paidBy?._id || e.paidBy || null,
    group: e.group,
    splitType: e.splitType || "none",
    splits: (e.splits || []).map((s) => ({
        userId: s.user?._id || s.user,
        name: s.user?.name || "Member",
        email: s.user?.email,
        amount: s.amount,
        status: s.status,
        approvedAt: s.approvedAt,
        paidAt: s.paidAt
    })),
    createdAt: e.createdAt
});

const distributeEqualMemberSplits = (memberIds, expenseAmount, currentUserId) => {
    const totalCents = Math.round(expenseAmount * 100);
    const count = memberIds.length;
    const baseCents = Math.floor(totalCents / count);
    let remainder = totalCents - baseCents * count;

    return memberIds.map((memberId) => {
        const cents = baseCents + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;

        const isPayer = currentUserId && String(memberId) === String(currentUserId);
        return {
            user: memberId,
            amount: Number((cents / 100).toFixed(2)),
            status: isPayer ? "approved" : "pending",
            approvedAt: isPayer ? new Date() : null
        };
    });
};

const resolveExpenseSplits = ({ group, expenseAmount, splitType, splits, currentUserId }) => {
    const requestedType = splitType || "equal";

    if (requestedType === "none") {
        return { error: null, splitType: "none", splits: [] };
    }

    if (!group || !Array.isArray(group.members) || group.members.length === 0) {
        return { error: null, splitType: "none", splits: [] };
    }

    const hasExplicitSplits = Array.isArray(splits) && splits.length > 0;

    if (requestedType === "equal" && !hasExplicitSplits) {
        return {
            error: null,
            splitType: "equal",
            splits: distributeEqualMemberSplits(group.members, expenseAmount, currentUserId)
        };
    }

    if ((requestedType === "custom" || requestedType === "equal") && hasExplicitSplits) {
        let splitSum = 0;
        const seenUsers = new Set();
        const resolvedSplits = [];

        for (const s of splits) {
            const splitUserId = s.user || s.userId;

            if (!splitUserId || !mongoose.Types.ObjectId.isValid(splitUserId)) {
                return { error: "Each split must specify a valid user" };
            }

            const uidKey = String(splitUserId);
            if (seenUsers.has(uidKey)) {
                return { error: "Duplicate member entries are not allowed in splits" };
            }
            seenUsers.add(uidKey);

            const isMember = group.members.some((m) => m.equals(splitUserId));
            if (!isMember) {
                return { error: `User ${splitUserId} is not a member of the group` };
            }

            const splitAmt = Number(s.amount);
            if (!Number.isFinite(splitAmt) || splitAmt <= 0) {
                return { error: "Each split amount must be a positive number" };
            }

            if (splitAmt > expenseAmount + 0.01) {
                return { error: "A member split cannot exceed the total expense amount" };
            }

            splitSum += splitAmt;
            const isPayer = currentUserId && uidKey === String(currentUserId);
            const safeStatus = isPayer
                ? "approved"
                : s.status === "approved"
                    ? "approved"
                    : "pending";

            resolvedSplits.push({
                user: splitUserId,
                amount: Number(splitAmt.toFixed(2)),
                status: safeStatus,
                approvedAt: safeStatus === "approved" ? new Date() : null
            });
        }

        if (Math.abs(splitSum - expenseAmount) > 0.01) {
            return {
                error: `Sum of splits ($${splitSum.toFixed(2)}) must equal the expense total ($${expenseAmount.toFixed(2)})`
            };
        }

        return {
            error: null,
            splitType: requestedType,
            splits: resolvedSplits
        };
    }

    if (requestedType === "custom") {
        return { error: "At least one member split is required for a custom split" };
    }

    return { error: null, splitType: "none", splits: [] };
};

// Create a new expense with automated split calculation
export const createExpense = async (req, res) => {
    try {
        const { title, amount, totalAmount, category, date, description, groupId, splitType, splits } = req.body;

        const rawAmount = Number(amount ?? totalAmount);

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Expense title is required"
            });
        }

        if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid positive expense amount is required"
            });
        }

        const expenseAmount = Number(rawAmount.toFixed(2));
        const validCategory = category && VALID_CATEGORIES.includes(category) ? category : "Other";

        let resolvedSplits = [];
        let resolvedSplitType = "none";

        // Group validation & split generation
        if (groupId) {
            if (!mongoose.Types.ObjectId.isValid(groupId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid group ID"
                });
            }

            const group = await Group.findOne({
                _id: groupId,
                deletedAt: null
            });

            if (!group) {
                return res.status(404).json({
                    success: false,
                    message: "Group not found"
                });
            }

            if (group.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: "Cannot add expenses to a closed group"
                });
            }

            // Membership authorization
            if (req.user?._id) {
                const isMember = group.members.some((m) => m.equals(req.user._id));
                if (!isMember) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not an authorized member of this group"
                    });
                }
            }

            const splitResult = resolveExpenseSplits({
                group,
                expenseAmount,
                splitType,
                splits,
                currentUserId: req.user?._id
            });

            if (splitResult.error) {
                return res.status(400).json({
                    success: false,
                    message: splitResult.error
                });
            }

            resolvedSplitType = splitResult.splitType;
            resolvedSplits = splitResult.splits;
        } else if (splitType && splitType !== "none") {
            return res.status(400).json({
                success: false,
                message: "Please select a group to split an expense among members"
            });
        }

        const expense = await Expense.create({
            title: title.trim(),
            category: validCategory,
            amount: expenseAmount,
            totalAmount: expenseAmount,
            currency: "USD",
            date: date || new Date().toISOString().split("T")[0],
            description: (description || "").trim(),
            paidBy: req.user?._id || new mongoose.Types.ObjectId("000000000000000000000001"),
            group: groupId || null,
            splitType: resolvedSplitType,
            splits: resolvedSplits
        });

        // Populate for returned response
        const populated = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("splits.user", "name email");

        return res.status(201).json({
            success: true,
            message: "Expense recorded successfully",
            expense: formatExpenseResponse(populated)
        });

    } catch (error) {
        console.error("Create expense error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create expense"
        });
    }
};

// Get list of expenses (with search & category filters)
export const getExpenses = async (req, res) => {
    try {
        const { search, category, groupId } = req.query;

        const filter = {deletedAt: null};

        if (groupId) {
            filter.group = groupId;
        }

        if (category && category !== "All") {
            filter.category = category;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { title: regex },
                { description: regex }
            ];
        }

        const expenses = await Expense.find(filter)
            .populate("paidBy", "name email")
            .populate("splits.user", "name email")
            .sort({ date: -1, createdAt: -1 });

        const formatted = expenses.map(formatExpenseResponse);

        return res.status(200).json({
            success: true,
            count: formatted.length,
            expenses: formatted
        });

    } catch (error) {
        console.error("Get expenses error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve expenses"
        });
    }
};

// Get single expense by ID
export const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID"
            });
        }

        const expense = await Expense.findById(id)
            .populate("paidBy", "name email")
            .populate("splits.user", "name email");

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        return res.status(200).json({
            success: true,
            expense: formatExpenseResponse(expense)
        });

    } catch (error) {
        console.error("Get expense by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve expense"
        });
    }
};

// Update an existing expense
export const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, totalAmount, category, date, description, splitType, splits } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID"
            });
        }

        const expense = await Expense.findOne({
            _id: id,
            deletedAt: null
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        const group = expense.group
            ? await Group.findById(expense.group)
            : null;

        const isCreator = expense.paidBy.equals(req.user._id);
        const isAdmin = group
            ? group.createdBy.equals(req.user._id)
            : false;

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this expense"
            });
        }

        if (group?.status === "closed") {
            return res.status(400).json({
                success: false,
                message: "Cannot edit expenses in a closed group"
            });
        }

        // Prevent modifying amount or splits if any split is already paid
        const hasPaidSplit = expense.splits?.some((s) => s.status === "paid");
        if (
            hasPaidSplit &&
            (amount !== undefined || totalAmount !== undefined || splitType !== undefined || splits !== undefined)
        ) {
            return res.status(400).json({
                success: false,
                message: "Cannot modify expense amount or splits because one or more member splits have already been paid"
            });
        }

        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Expense title is required"
                });
            }
            expense.title = String(title).trim();
        }
        if (category !== undefined && VALID_CATEGORIES.includes(category)) {
            expense.category = category;
        }
        if (amount !== undefined || totalAmount !== undefined) {
            const newAmt = Number(amount ?? totalAmount);
            if (!Number.isFinite(newAmt) || newAmt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "A valid positive expense amount is required"
                });
            }
            expense.amount = Number(newAmt.toFixed(2));
            expense.totalAmount = Number(newAmt.toFixed(2));
        }
        if (date !== undefined) expense.date = date;
        if (description !== undefined) expense.description = String(description).trim();

        // Update splits if requested, or recalculate equal splits if total amount changed without custom splits
        if (splitType !== undefined || splits !== undefined) {
            if (expense.group && group) {
                const splitResult = resolveExpenseSplits({
                    group,
                    expenseAmount: Number(expense.amount),
                    splitType: splitType ?? expense.splitType,
                    splits,
                    currentUserId: req.user?._id
                });
                if (splitResult.error) {
                    return res.status(400).json({
                        success: false,
                        message: splitResult.error
                    });
                }
                expense.splitType = splitResult.splitType;
                expense.splits = splitResult.splits;
            } else if (splitType && splitType !== "none") {
                return res.status(400).json({
                    success: false,
                    message: "Please select a group to split an expense among members"
                });
            } else {
                expense.splitType = "none";
                expense.splits = [];
            }
        } else if (
            (amount !== undefined || totalAmount !== undefined) &&
            expense.group &&
            group &&
            expense.splitType === "equal"
        ) {
            const participantIds = (expense.splits?.length > 0
                ? expense.splits.map((s) => s.user)
                : group.members);
            expense.splits = distributeEqualMemberSplits(
                participantIds,
                Number(expense.amount),
                req.user?._id
            );
        } else if (
            (amount !== undefined || totalAmount !== undefined) &&
            expense.splitType === "custom" &&
            expense.splits?.length > 0
        ) {
            const existingSum = expense.splits.reduce(
                (sum, s) => sum + Number(s.amount || 0),
                0
            );
            if (Math.abs(existingSum - Number(expense.amount)) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Custom split shares ($${existingSum.toFixed(2)}) must be updated to equal the new total ($${Number(expense.amount).toFixed(2)})`
                });
            }
        }

        await expense.save();

        const populated = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("splits.user", "name email");

        return res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            expense: formatExpenseResponse(populated)
        });

    } catch (error) {
        console.error("Update expense error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update expense"
        });
    }
};


export const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID"
            });
        }

        const expense = await Expense.findOne({
            _id: id,
            deletedAt: null
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        const group = expense.group
            ? await Group.findById(expense.group)
            : null;

        const isCreator = expense.paidBy.equals(req.user._id);

        const isAdmin = group
            ? group.createdBy.equals(req.user._id)
            : false;

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this expense"
            });
        }

        if (group?.status === "closed") {
            return res.status(400).json({
                success: false,
                message: "Cannot delete expenses from a closed group"
            });
        }

        // Check payment records, not just split statuses.
        const paymentInProgress = await Payment.findOne({
            expense: expense._id,
            status: { $in: ["pending", "approved", "authorized"] }
        });

        if (paymentInProgress) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete an expense while a payment is pending or processing"
            });
        }

        const hasPaidSplit = expense.splits?.some(
            split => split.status === "paid"
        );

        const hasCapturedPayment = await Payment.exists({
            expense: expense._id,
            status: "captured"
        });

        if (hasPaidSplit || hasCapturedPayment) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete an expense with completed payments. Resolve or refund the payments first."
            });
        }

        expense.deletedAt = new Date();
        expense.deletedBy = req.user._id;

        await expense.save();

        return res.status(200).json({
            success: true,
            message: "Expense deleted successfully",
            id
        });

    } catch (error) {
        console.error("Delete expense error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete expense"
        });
    }
};

// Member review and approve their individual share
export const approveExpenseSplit = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID"
            });
        }

        const expense = await Expense.findById(id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        // Find user's split
        const splitIndex = expense.splits.findIndex(s => s.user.equals(req.user._id));

        if (splitIndex === -1) {
            return res.status(403).json({
                success: false,
                message: "You do not have an assigned split in this expense"
            });
        }

        const split = expense.splits[splitIndex];

        if (split.status === "paid") {
            return res.status(400).json({
                success: false,
                message: "This split is already paid"
            });
        }

        if (split.status === "approved") {
            return res.status(200).json({
                success: true,
                message: "Split is already approved",
                split
            });
        }

        split.status = "approved";
        split.approvedAt = new Date();

        await expense.save();

        return res.status(200).json({
            success: true,
            message: "Your split has been reviewed and approved",
            split: {
                userId: split.user,
                amount: split.amount,
                status: split.status,
                approvedAt: split.approvedAt
            }
        });

    } catch (error) {
        console.error("Approve expense split error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to approve split"
        });
    }
};

// Summary metrics (categories, totals, averages)
export const getExpenseSummary = async (req, res) => {
    try {
        const { groupId } = req.query;
        const filter = groupId
    ? { group: groupId, deletedAt: null }
    : { deletedAt: null };

        const expenses = await Expense.find(filter);

        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const count = expenses.length;
        const averageExpense = count ? totalExpenses / count : 0;

        const categories = [
            "Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Travel", "Other"
        ];

        const categoryTotals = categories.map(cat => {
            const catExpenses = expenses.filter(e => e.category === cat);
            const amount = catExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
            return {
                name: cat,
                amount,
                count: catExpenses.length
            };
        }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

        return res.status(200).json({
            success: true,
            totalExpenses,
            count,
            averageExpense,
            categoryTotals
        });

    } catch (error) {
        console.error("Expense summary error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to calculate expense summary"
        });
    }
};
