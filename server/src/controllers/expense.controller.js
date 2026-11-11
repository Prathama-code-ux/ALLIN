import Expense from "../models/expense.js";
import Group from "../models/Group.js";
import mongoose from "mongoose";
import Payment from "../models/payment.js";

// Create a new expense with automated split calculation
export const createExpense = async (req, res) => {
    try {
        const { title, amount, totalAmount, category, date, description, groupId, splitType, splits } = req.body;

        const expenseAmount = Number(amount ?? totalAmount);

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Expense title is required"
            });
        }

        if (isNaN(expenseAmount) || expenseAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid positive expense amount is required"
            });
        }

        const validCategory = category && [
            "Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Travel", "Other"
        ].includes(category) ? category : "Other";

        let resolvedSplits = [];
        let resolvedSplitType = splitType || "none";

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
                const isMember = group.members.some(m => m.equals(req.user._id));
                if (!isMember) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not an authorized member of this group"
                    });
                }
            }

            // If splitType is equal or not provided, calculate equal splits across group members
            if (resolvedSplitType === "equal" || (!splits && group.members.length > 0)) {
                resolvedSplitType = "equal";
                const memberCount = group.members.length;
                const baseShare = Math.floor((expenseAmount / memberCount) * 100) / 100;
                let remainderCents = Math.round((expenseAmount - (baseShare * memberCount)) * 100);

                resolvedSplits = group.members.map(memberId => {
                    const extraCent = remainderCents > 0 ? 0.01 : 0;
                    if (remainderCents > 0) remainderCents--;

                    const memberAmount = Number((baseShare + extraCent).toFixed(2));
                    const isPayer = req.user?._id && memberId.equals(req.user._id);

                    return {
                        user: memberId,
                        amount: memberAmount,
                        status: isPayer ? "approved" : "pending",
                        approvedAt: isPayer ? new Date() : null
                    };
                });
            } else if (resolvedSplitType === "custom" && Array.isArray(splits) && splits.length > 0) {
                // Validate custom splits
                let splitSum = 0;
                resolvedSplits = [];

                for (const s of splits) {
                    const splitUserId = s.user || s.userId;
                    const splitAmt = Number(s.amount);

                    if (!splitUserId || !mongoose.Types.ObjectId.isValid(splitUserId)) {
                        return res.status(400).json({
                            success: false,
                            message: "Each split must specify a valid user"
                        });
                    }

                    const isMember = group.members.some(m => m.equals(splitUserId));
                    if (!isMember) {
                        return res.status(400).json({
                            success: false,
                            message: `User ${splitUserId} is not a member of the group`
                        });
                    }

                    if (isNaN(splitAmt) || splitAmt <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: "Each split amount must be a positive number"
                        });
                    }

                    splitSum += splitAmt;
                    const isPayer = req.user?._id && String(splitUserId) === String(req.user._id);

                    resolvedSplits.push({
                        user: splitUserId,
                        amount: Number(splitAmt.toFixed(2)),
                        status: isPayer ? "approved" : (s.status || "pending"),
                        approvedAt: isPayer ? new Date() : null
                    });
                }

                // Check that split sum equals total amount (within 0.01 tolerance)
                if (Math.abs(splitSum - expenseAmount) > 0.01) {
                    return res.status(400).json({
                        success: false,
                       message: `Sum of splits (₹${splitSum.toFixed(2)}) must equal the expense total (₹${expenseAmount.toFixed(2)})`
                    });
                }
            }
        }

        const expense = await Expense.create({
    title: title.trim(),
    category: validCategory,
    amount: expenseAmount,
    totalAmount: expenseAmount,
    currency: "INR",
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
            expense: {
                id: populated._id,
                _id: populated._id,
                title: populated.title,
                category: populated.category,
                amount: populated.amount,
                currency: populated.currency || "INR",
                totalAmount: populated.totalAmount,
                date: populated.date,
                description: populated.description,
                group: populated.group,
                paidBy: populated.paidBy?.name || "Member",
                paidById: populated.paidBy?._id,
                splitType: populated.splitType,
                splits: (populated.splits || []).map(s => ({
                    userId: s.user?._id || s.user,
                    name: s.user?.name || "Member",
                    email: s.user?.email,
                    amount: s.amount,
                    status: s.status,
                    approvedAt: s.approvedAt,
                    paidAt: s.paidAt
                })),
                createdAt: populated.createdAt
            }
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

        const formatted = expenses.map(e => ({
            id: e._id,
            _id: e._id,
            title: e.title,
            category: e.category,
            amount: e.amount,
            currency: e.currency || "INR",
            totalAmount: e.totalAmount || e.amount,
            date: e.date,
            description: e.description,
            paidBy: e.paidBy?.name || "Member",
            paidById: e.paidBy?._id,
            group: e.group,
            splitType: e.splitType || "none",
            splits: (e.splits || []).map(s => ({
                userId: s.user?._id || s.user,
                name: s.user?.name || "Member",
                email: s.user?.email,
                amount: s.amount,
                status: s.status,
                approvedAt: s.approvedAt,
                paidAt: s.paidAt
            })),
            createdAt: e.createdAt
        }));

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
            expense: {
                id: expense._id,
                _id: expense._id,
                title: expense.title,
                category: expense.category,
                amount: expense.amount,
                currency: expense.currency || "INR",
                totalAmount: expense.totalAmount,
                date: expense.date,
                description: expense.description,
                group: expense.group,
                paidBy: expense.paidBy?.name || "Member",
                paidById: expense.paidBy?._id,
                splitType: expense.splitType,
                splits: (expense.splits || []).map(s => ({
                    userId: s.user?._id || s.user,
                    name: s.user?.name || "Member",
                    email: s.user?.email,
                    amount: s.amount,
                    status: s.status,
                    approvedAt: s.approvedAt,
                    paidAt: s.paidAt
                })),
                createdAt: expense.createdAt
            }
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
        const { title, amount, totalAmount, category, date, description } = req.body;

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

if (expense.deletedAt) {
    return res.status(404).json({
        success: false,
        message: "Expense not found"
    });
}

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        // Prevent modifying amount if any split is already paid
        const hasPaidSplit = expense.splits?.some(s => s.status === "paid");
        if (hasPaidSplit && (amount !== undefined || totalAmount !== undefined)) {
            return res.status(400).json({
                success: false,
                message: "Cannot modify expense amount because one or more member splits have already been paid"
            });
        }

        if (title !== undefined) expense.title = title.trim();
        if (category !== undefined) expense.category = category;
        if (amount !== undefined || totalAmount !== undefined) {
            const newAmt = Number(amount ?? totalAmount);
            if (!isNaN(newAmt) && newAmt > 0) {
                expense.amount = newAmt;
                expense.totalAmount = newAmt;
            }
        }
        if (date !== undefined) expense.date = date;
        if (description !== undefined) expense.description = description.trim();

        await expense.save();

        return res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            expense: {
                id: expense._id,
                _id: expense._id,
                title: expense.title,
                category: expense.category,
                amount: expense.amount,
                currency: expense.currency || "INR",
                date: expense.date,
                description: expense.description
            }
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
