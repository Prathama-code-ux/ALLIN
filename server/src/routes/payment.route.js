import express from "express";
import {
    createPaymentOrder,
    capturePaymentOrder,
    getTransactions
} from "../controllers/payment.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Optional auth helper
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return protect(req, res, next);
    }
    next();
};

// Create PayPal order
router.post("/create-order", optionalAuth, createPaymentOrder);

// Capture PayPal order
router.post("/:orderId/capture", optionalAuth, capturePaymentOrder);

// Get transaction history
router.get("/transactions", optionalAuth, getTransactions);

export default router;
