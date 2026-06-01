const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["order_update", "review", "message", "system"],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        linkedEntityId: {
            type: String,
            default: "",
        },
        linkedRoute: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Optimize queries on recipient userId
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
