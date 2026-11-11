import express from "express";
import {
    createGroup,
    getMyGroups,
    joinGroup,
    getGroupById,
    getGroupContributions
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createGroup);
router.get("/", protect, getMyGroups);
router.post("/join", protect, joinGroup);
router.get("/:id", protect, getGroupById);
router.get("/:id/contributions", protect, getGroupContributions);

export default router;
