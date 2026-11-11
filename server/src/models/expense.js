import mongoose from "mongoose";

const splitSchema = new mongoose.Schema(
  {
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
      enum: ["pending", "approved", "paid"],
      default: "pending"
    },
    approvedAt: {
      type: Date,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: [
        "Food",
        "Transport",
        "Shopping",
        "Entertainment",
        "Bills",
        "Health",
        "Travel",
        "Other"
      ],
      default: "Other"
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    totalAmount: {
      type: Number,
      min: 0,
      default: function () {
        return this.amount;
      }
    },

    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0]
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null
    },

    splitType: {
      type: String,
      enum: ["equal", "custom", "none"],
      default: "none"
    },

    splits: {
      type: [splitSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Synchronous hook to ensure amount and totalAmount stay synchronized
expenseSchema.pre("save", function () {
  if (this.amount !== undefined && this.totalAmount === undefined) {
    this.totalAmount = this.amount;
  } else if (this.totalAmount !== undefined && this.amount === undefined) {
    this.amount = this.totalAmount;
  }
});

const Expense = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);

export default Expense;
