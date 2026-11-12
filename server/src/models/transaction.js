import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["CONTRIBUTION", "POOL_EXPENSE", "PERSONAL_ADVANCE", "REIMBURSEMENT"],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "USD"
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    counterparty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true
    },
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
      index: true
    },
    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
      default: null,
      index: true
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ["COMPLETED", "PENDING", "FAILED"],
      default: "COMPLETED",
      index: true
    },
    description: {
      type: String,
      default: ""
    },
    date: {
      type: Date,
      default: Date.now
    },
    paypalOrderId: {
      type: String,
      default: null
    },
    paypalCaptureId: {
      type: String,
      default: null
    },
    idempotencyKey: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      index: true
    }
  },
  { timestamps: true }
);

transactionSchema.index({ group: 1, createdAt: -1 });
transactionSchema.index({ user: 1, createdAt: -1 });

// Ensure any stale problematic non-sparse index is safely dropped if exists
mongoose.connection.on("open", async () => {
  try {
    const collection = mongoose.connection.collection("transactions");
    const indexes = await collection.indexes();
    const staleIndex = indexes.find((i) => i.name === "idempotencyKey_1" && !i.sparse);
    if (staleIndex) {
      await collection.dropIndex("idempotencyKey_1").catch(() => {});
    }
  } catch (ignore) {}
});

const Transaction =
  mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

export default Transaction;
