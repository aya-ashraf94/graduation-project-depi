const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        buyerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "shipped", "delivered", "cancelled"],
            default: "pending"
        },
        paymentMethod: {
            type: String,
            required: true
        },
        shippingAddress: {
            type: String,
            required: true
        },
        notes: {
            type: String
        },
        trackingNumber: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Order", orderSchema);
