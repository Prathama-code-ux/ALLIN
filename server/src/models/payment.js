
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: true
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
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
      default: null
    },

    paypalCaptureId: {
      type: String,
      default: null
    },

    paidAt: {
      type: Date,
      default: null
    },

    paypalAuthorizationId: {
        type: String,
        default: null
    },

  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
