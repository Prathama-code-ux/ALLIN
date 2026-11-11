import express from "express";
import {
    createExpense,
    getExpenses,
    getExpenseSummary,
    getExpenseById,
    updateExpense,
    deleteExpense
} from "../controllers/expense.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Optional auth helper: if token provided, sets req.user, but doesn't reject if not
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return protect(req, res, next);
    }
    next();
};

router.post("/", optionalAuth, createExpense);
router.get("/", optionalAuth, getExpenses);
router.get("/summary", optionalAuth, getExpenseSummary);
router.get("/:id", optionalAuth, getExpenseById);
router.put("/:id", optionalAuth, updateExpense);
router.delete("/:id", optionalAuth, deleteExpense);

export default router;
