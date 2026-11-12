import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    targetAmount: {
      type: Number,
      required: true,
      min: 0
    },

    poolBalance: {
      type: Number,
      default: 0,
      min: 0
    },

    collectedAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    inviteCode: {
      type: String,
      required: true,
      unique: true
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active"
    },

    closedAt: {
      type: Date,
      default: null
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    deletedAt: {
      type: Date,
      default: null
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Group =
  mongoose.models.Group ||
  mongoose.model("Group", groupSchema);

export default Group;
