import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
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

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "authorized",
        "captured",
        "failed",
        "voided",
        "refunded"
      ],
      default: "pending"
    },

    paypalOrderId: {
      type: String,
      default: null,
      index: true
    },

    paypalCaptureId: {
      type: String,
      default: null
    },

    paypalAuthorizationId: {
      type: String,
      default: null
    },

    payerName: {
      type: String,
      default: null
    },

    payerEmail: {
      type: String,
      default: null
    },

    description: {
      type: String,
      default: ""
    },

    paidAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
