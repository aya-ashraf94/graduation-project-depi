const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isSuspended: {
            type: Boolean,
            default: false,
        },

        avatar: {
            type: String,
            default: ""
        },

        bio: {
            type: String,
            default: ""
        },

        phoneNumber: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            default: ""
        },

        tags: {
            type: [String],
            default: []
        },

        rating: {
            type: Number,
            default: 5.0
        },

        totalSales: {
            type: Number,
            default: 0
        },

        totalPurchases: {
            type: Number,
            default: 0
        },

        wishlist: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],

        resetPasswordToken: {
            type: String,
            default: null
        },

        resetPasswordExpires: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("User", userSchema);
