import express from "express";
import {
    createExpense,
    getExpenses,
    getExpenseSummary,
    getExpenseById,
    updateExpense,
    deleteExpense,
    approveExpenseSplit
} from "../controllers/expense.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Optional auth helper: if token provided, sets req.user for personalization
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return protect(req, res, next);
    }
    next();
};

// Public/Optional read routes (backward compatible)
router.get("/", optionalAuth, getExpenses);
router.get("/summary", optionalAuth, getExpenseSummary);
router.get("/:id", optionalAuth, getExpenseById);

// Strictly protected mutation routes
router.post("/", protect, createExpense);
router.put("/:id", protect, updateExpense);
router.delete("/:id", protect, deleteExpense);
router.patch("/:id/splits/approve", protect, approveExpenseSplit);

export default router;
