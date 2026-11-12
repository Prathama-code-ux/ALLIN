import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true
    },
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
      index: true
    },
    debtor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    creditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    settledAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: "USD"
    },
    status: {
      type: String,
      enum: ["pending", "partial", "completed"],
      default: "pending",
      index: true
    },
    settledAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

settlementSchema.index({ group: 1, debtor: 1, creditor: 1, status: 1 });

const Settlement =
  mongoose.models.Settlement || mongoose.model("Settlement", settlementSchema);

export default Settlement;
