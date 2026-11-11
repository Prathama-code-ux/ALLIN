import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        eventType: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum:["processing", "processed"],
            default: "processing"
        },
        processedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);
const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);
export default WebhookEvent;