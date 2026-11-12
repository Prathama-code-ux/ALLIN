import mongoose from "mongoose";
import Group from "../models/Group.js";
import geminiService, { extractReceiptData } from "../services/gemini.service.js";
import {
  decodeAndValidateReceiptImage,
  validateAndNormalizeReceipt,
} from "../utils/receiptParser.js";

/**
 * POST /api/ai/parse-receipt
 * Authenticated endpoint that validates an uploaded receipt image and group permission,
 * invokes Gemini Vision, and returns sanitized, deterministic-ready receipt data.
 */
export const parseReceipt = async (req, res) => {
  try {
    const { imageBase64, mimeType, groupId } = req.body || {};

    // Validate group permission if a groupId was supplied
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid group ID",
        });
      }

      const group = await Group.findOne({
        _id: groupId,
        deletedAt: null,
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Group not found",
        });
      }

      if (group.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Cannot scan receipts for a closed group",
        });
      }

      const isMember = group.members.some((member) => member.equals(req.user._id));
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "You are not an authorized member of this group",
        });
      }
    }

    // Validate receipt image format, size, and magic bytes
    const imageCheck = decodeAndValidateReceiptImage({ imageBase64, mimeType });
    if (!imageCheck.ok) {
      return res.status(imageCheck.status).json({
        success: false,
        message: imageCheck.message,
      });
    }

    // Invoke Gemini Vision without passing any user PII
    const rawAiResponse = await (
      geminiService.extractReceiptData || extractReceiptData
    )({
      base64Data: imageCheck.base64Data,
      mimeType: imageCheck.mimeType,
    });

    // Validate & normalize AI JSON on backend without inventing missing values
    const normalized = validateAndNormalizeReceipt(rawAiResponse);
    if (!normalized.ok) {
      return res.status(normalized.status).json({
        success: false,
        message: normalized.message,
      });
    }

    return res.status(200).json({
      success: true,
      receipt: normalized.receipt,
    });
  } catch (error) {
    console.error("Parse receipt error:", error);
    const status = error?.status || 500;
    return res.status(status).json({
      success: false,
      code: error?.code || "RECEIPT_PARSE_ERROR",
      message:
        error?.message ||
        "Unable to scan receipt right now. Please try again or enter the expense manually.",
    });
  }
};

