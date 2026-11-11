import express from "express";
import {
    createGroup,
    getMyGroups,
    joinGroup,
    getGroupById,
    getGroupContributions,
    closeGroup,
    deleteGroup
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createGroup);
router.get("/", protect, getMyGroups);
router.post("/join", protect, joinGroup);
router.patch("/:id/close", protect, closeGroup);
router.delete("/:id", protect, deleteGroup);
router.get("/:id", protect, getGroupById);
router.get("/:id/contributions", protect, getGroupContributions);

export default router;
