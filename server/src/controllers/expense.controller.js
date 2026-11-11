import Expense from "../models/expense.js";
import mongoose from "mongoose";

// Create a new expense
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

        const expense = await Expense.create({
            title: title.trim(),
            category: validCategory,
            amount: expenseAmount,
            totalAmount: expenseAmount,
            date: date || new Date().toISOString().split("T")[0],
            description: (description || "").trim(),
            paidBy: req.user?._id || new mongoose.Types.ObjectId("000000000000000000000001"),
            group: groupId || null,
            splitType: splitType || "none",
            splits: splits || []
        });

        return res.status(201).json({
            success: true,
            message: "Expense recorded successfully",
            expense: {
                id: expense._id,
                _id: expense._id,
                title: expense.title,
                category: expense.category,
                amount: expense.amount,
                date: expense.date,
                description: expense.description,
                createdAt: expense.createdAt
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

        const filter = {};

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
            .sort({ date: -1, createdAt: -1 });

        const formatted = expenses.map(e => ({
            id: e._id,
            _id: e._id,
            title: e.title,
            category: e.category,
            amount: e.amount,
            date: e.date,
            description: e.description,
            paidBy: e.paidBy?.name || "Member",
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

        const expense = await Expense.findById(id).populate("paidBy", "name email");

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        return res.status(200).json({
            success: true,
            expense
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

        const expense = await Expense.findById(id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
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

        const deleted = await Expense.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

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

// Summary metrics (categories, totals, averages)
export const getExpenseSummary = async (req, res) => {
    try {
        const { groupId } = req.query;
        const filter = groupId ? { group: groupId } : {};

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
