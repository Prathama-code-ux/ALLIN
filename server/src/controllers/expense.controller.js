import Expense from "../models/expense.js";
import Group from "../models/Group.js";
import Payment from "../models/payment.js";
import Settlement from "../models/settlement.js";
import Transaction from "../models/transaction.js";
import mongoose from "mongoose";

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
    paymentSource: e.paymentSource || "personal",
    status: e.status || "pending",
    paidAt: e.paidAt || null,
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

// Calculate verified available pool balance dynamically from DB records
export const getAvailablePoolBalance = async (groupId) => {
    const confirmedPayments = await Payment.find({
        group: groupId,
        paymentPurpose: { $in: ["GROUP_CONTRIBUTION", null] },
        status: "captured",
        expense: null,
        settlement: null
    });

    const totalConfirmed = confirmedPayments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
    );

    const poolExpenses = await Expense.find({
        group: groupId,
        paymentSource: "pool",
        deletedAt: null,
        status: "paid"
    });

    const totalPoolSpent = poolExpenses.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
    );

    return {
        confirmedContributions: Number(totalConfirmed.toFixed(2)),
        poolSpent: Number(totalPoolSpent.toFixed(2)),
        availableBalance: Math.max(0, Number((totalConfirmed - totalPoolSpent).toFixed(2)))
    };
};

// Create a new expense with automated split calculation, pool balance check, and settlement generation
export const createExpense = async (req, res) => {
    try {
        const {
            title,
            amount,
            totalAmount,
            category,
            date,
            description,
            groupId,
            splitType,
            splits,
            paymentSource = "personal"
        } = req.body;

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
        const payerId = req.user?._id || new mongoose.Types.ObjectId("000000000000000000000001");

        let resolvedSplits = [];
        let resolvedSplitType = "none";
        let targetGroup = null;

        // Group validation & split generation
        if (groupId) {
            if (!mongoose.Types.ObjectId.isValid(groupId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid group ID"
                });
            }

            targetGroup = await Group.findOne({
                _id: groupId,
                deletedAt: null
            });

            if (!targetGroup) {
                return res.status(404).json({
                    success: false,
                    message: "Group not found"
                });
            }

            if (targetGroup.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: "Cannot add expenses to a closed group"
                });
            }

            // Membership authorization
            if (req.user?._id) {
                const isMember = targetGroup.members.some((m) => m.equals(req.user._id));
                if (!isMember) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not an authorized member of this group"
                    });
                }
            }

            const splitResult = resolveExpenseSplits({
                group: targetGroup,
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
        } else {
            if (paymentSource === "pool") {
                return res.status(400).json({
                    success: false,
                    message: "Pool-funded expenses must be associated with an active group"
                });
            }
            if (splitType && splitType !== "none") {
                return res.status(400).json({
                    success: false,
                    message: "Please select a group to split an expense among members"
                });
            }
        }

        // Handle Pool Payment vs Personal Advance
        if (paymentSource === "pool") {
            const { availableBalance } = await getAvailablePoolBalance(targetGroup._id);

            if (availableBalance < expenseAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient group pool balance ($${availableBalance.toFixed(2)}) for this expense ($${expenseAmount.toFixed(2)})`
                });
            }

            // Mark all splits as paid since pool funded it
            resolvedSplits = resolvedSplits.map((s) => ({
                ...s,
                status: "paid",
                paidAt: new Date()
            }));

            // Create expense
            const expense = await Expense.create({
                title: title.trim(),
                category: validCategory,
                amount: expenseAmount,
                totalAmount: expenseAmount,
                currency: "USD",
                date: date || new Date().toISOString().split("T")[0],
                description: (description || "").trim(),
                paidBy: payerId,
                group: targetGroup._id,
                paymentSource: "pool",
                status: "paid",
                paidAt: new Date(),
                splitType: resolvedSplitType,
                splits: resolvedSplits
            });

            // Atomically update group pool balance
            await Group.updateOne(
                { _id: targetGroup._id },
                { $inc: { poolBalance: -expenseAmount } }
            );

            // Audit transaction record
            await Transaction.create({
                type: "POOL_EXPENSE",
                amount: expenseAmount,
                currency: "USD",
                user: payerId,
                group: targetGroup._id,
                expense: expense._id,
                status: "COMPLETED",
                description: `Pool-funded expense: ${title.trim()}`,
                date: new Date(),
                idempotencyKey: `pool-${expense._id}`
            });

            const populated = await Expense.findById(expense._id)
                .populate("paidBy", "name email")
                .populate("splits.user", "name email");

            return res.status(201).json({
                success: true,
                message: "Pool-funded expense recorded successfully",
                expense: formatExpenseResponse(populated)
            });
        }

        // Case: Personal Advance (paid by member using personal funds)
        const expense = await Expense.create({
            title: title.trim(),
            category: validCategory,
            amount: expenseAmount,
            totalAmount: expenseAmount,
            currency: "USD",
            date: date || new Date().toISOString().split("T")[0],
            description: (description || "").trim(),
            paidBy: payerId,
            group: targetGroup ? targetGroup._id : null,
            paymentSource: "personal",
            status: "paid",
            paidAt: new Date(),
            splitType: resolvedSplitType,
            splits: resolvedSplits
        });

        // Generate reimbursement obligations (Settlements) for other members
        if (targetGroup && resolvedSplits.length > 0) {
            const payerIdStr = String(payerId);
            for (const split of resolvedSplits) {
                const splitUserIdStr = split.user?._id ? String(split.user._id) : String(split.user);
                // Exclude payer's own share from amount owed to them!
                if (splitUserIdStr !== payerIdStr && split.amount > 0) {
                    await Settlement.create({
                        group: targetGroup._id,
                        expense: expense._id,
                        debtor: split.user,
                        creditor: payerId,
                        amount: Number(split.amount.toFixed(2)),
                        settledAmount: 0,
                        currency: "USD",
                        status: "pending"
                    });
                }
            }

            // Record transaction audit log for personal advance
            await Transaction.create({
                type: "PERSONAL_ADVANCE",
                amount: expenseAmount,
                currency: "USD",
                user: payerId,
                group: targetGroup._id,
                expense: expense._id,
                status: "COMPLETED",
                description: `Personal advance by member: ${title.trim()}`,
                date: new Date(),
                idempotencyKey: `advance-${expense._id}`
            });
        }

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

// Get list of expenses
export const getExpenses = async (req, res) => {
    try {
        const { search, category, groupId } = req.query;

        const filter = { deletedAt: null };

        if (groupId) {
            filter.group = groupId;
        }

        if (category && category !== "All") {
            filter.category = category;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [{ title: regex }, { description: regex }];
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

        const group = expense.group ? await Group.findById(expense.group) : null;

        const isCreator = expense.paidBy.equals(req.user._id);
        const isAdmin = group ? group.createdBy.equals(req.user._id) : false;

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

        // Prevent modifying amount or splits if any split or settlement is already paid
        const pUidStr = expense.paidBy?._id ? String(expense.paidBy._id) : String(expense.paidBy);
        const hasPaidSplit = expense.splits?.some((s) => {
            const sUidStr = s.user?._id ? String(s.user._id) : String(s.user);
            return s.status === "paid" && sUidStr !== pUidStr;
        });
        const hasSettledPayment = await Settlement.exists({
            expense: expense._id,
            settledAmount: { $gt: 0 }
        });

        if (
            (hasPaidSplit || hasSettledPayment) &&
            (amount !== undefined || totalAmount !== undefined || splitType !== undefined || splits !== undefined)
        ) {
            return res.status(400).json({
                success: false,
                message: "Cannot modify expense amount or splits because one or more member splits have already been paid"
            });
        }

        // Pool balance adjustments if amount changes on pool-funded expense
        const oldAmount = Number(expense.amount);
        let newAmount = oldAmount;

        if (amount !== undefined || totalAmount !== undefined) {
            const parsedAmt = Number(amount ?? totalAmount);
            if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "A valid positive expense amount is required"
                });
            }
            newAmount = Number(parsedAmt.toFixed(2));

            if (expense.paymentSource === "pool" && group && Math.abs(newAmount - oldAmount) > 0.009) {
                const difference = newAmount - oldAmount;
                if (difference > 0) {
                    const { availableBalance } = await getAvailablePoolBalance(group._id);
                    if (availableBalance < difference) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient group pool balance to increase expense by $${difference.toFixed(2)}`
                        });
                    }
                    await Group.updateOne({ _id: group._id }, { $inc: { poolBalance: -difference } });
                } else {
                    await Group.updateOne({ _id: group._id }, { $inc: { poolBalance: Math.abs(difference) } });
                }
            }

            expense.amount = newAmount;
            expense.totalAmount = newAmount;
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
        if (date !== undefined) expense.date = date;
        if (description !== undefined) expense.description = String(description).trim();

        // Recalculate splits if requested
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
            const participantIds = expense.splits?.length > 0
                ? expense.splits.map((s) => s.user)
                : group.members;
            expense.splits = distributeEqualMemberSplits(
                participantIds,
                Number(expense.amount),
                req.user?._id
            );
        }

        await expense.save();

        // Update corresponding settlements if personal advance
        if (expense.paymentSource === "personal" && expense.group) {
            await Settlement.deleteMany({ expense: expense._id, settledAmount: 0 });
            const expPaidByStr = expense.paidBy?._id ? String(expense.paidBy._id) : String(expense.paidBy);
            for (const split of expense.splits) {
                const sUserStr = split.user?._id ? String(split.user._id) : String(split.user);
                if (sUserStr !== expPaidByStr && split.amount > 0) {
                    await Settlement.create({
                        group: expense.group,
                        expense: expense._id,
                        debtor: split.user,
                        creditor: expense.paidBy,
                        amount: Number(split.amount.toFixed(2)),
                        settledAmount: 0,
                        currency: "USD",
                        status: "pending"
                    });
                }
            }
        }

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

// Delete an expense
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

        const group = expense.group ? await Group.findById(expense.group) : null;
        const isCreator = expense.paidBy.equals(req.user._id);
        const isAdmin = group ? group.createdBy.equals(req.user._id) : false;

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

        // Prevent deletion if payment in progress or captured
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

        const hasSettledAmount = await Settlement.exists({
            expense: expense._id,
            settledAmount: { $gt: 0 }
        });

        if (hasSettledAmount) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete an expense with completed settlements. Resolve or refund the payments first."
            });
        }

        // If pool-funded, refund the pool balance
        if (expense.paymentSource === "pool" && expense.group) {
            await Group.updateOne(
                { _id: expense.group },
                { $inc: { poolBalance: Number(expense.amount) } }
            );
        }

        // Clean up pending settlements
        await Settlement.deleteMany({
            expense: expense._id,
            settledAmount: 0
        });

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

// Approve an individual split
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

        const splitIndex = expense.splits.findIndex((s) => s.user.equals(req.user._id));

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
        const filter = groupId ? { group: groupId, deletedAt: null } : { deletedAt: null };

        const expenses = await Expense.find(filter);

        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const count = expenses.length;
        const averageExpense = count ? totalExpenses / count : 0;

        const categories = [
            "Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Travel", "Other"
        ];

        const categoryTotals = categories
            .map((cat) => {
                const catExpenses = expenses.filter((e) => e.category === cat);
                const amount = catExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                return {
                    name: cat,
                    amount,
                    count: catExpenses.length
                };
            })
            .filter((c) => c.amount > 0)
            .sort((a, b) => b.amount - a.amount);

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
