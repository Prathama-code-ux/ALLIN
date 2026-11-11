import express from "express";
import {
    createPaymentOrder,
    capturePaymentOrder,
    getTransactions,
    handlePayPalWebhook
} from "../controllers/payment.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Optional auth helper for read-only history
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return protect(req, res, next);
    }
    next();
};

// Mandatory authentication on payment transactions
router.post("/create-order", protect, createPaymentOrder);
router.post("/:orderId/capture", protect, capturePaymentOrder);

// Public webhook endpoint (signature verified cryptographically)
router.post("/webhook", handlePayPalWebhook);

// Transaction history
router.get("/transactions", optionalAuth, getTransactions);

export default router;
