import express from "express";
import { parseReceipt } from "../controllers/ai.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

export const receiptScanRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: Number(process.env.AI_RATE_LIMIT_PER_MIN || 12),
  message: "Too many receipt scan requests. Please wait a minute or enter the expense manually.",
});

router.post("/parse-receipt", protect, receiptScanRateLimiter, parseReceipt);

export default router;

