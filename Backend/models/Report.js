const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        reason: {
            type: String,
            required: true
        },
        details: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Report", reportSchema);
