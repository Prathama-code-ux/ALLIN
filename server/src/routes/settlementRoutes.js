import express from "express";
import { getMySettlements, getSettlementById } from "../controllers/settlement.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getMySettlements);
router.get("/:id", protect, getSettlementById);

export default router;
