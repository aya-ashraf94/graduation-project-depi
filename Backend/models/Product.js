const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: { 
            type: String, 
            required: true 
        },
        price: { 
            type: Number, 
            required: true 
        },
        currency: { 
            type: String, 
            default: "EGP" 
        },
        categoryId: { 
            type: String, 
            required: true 
        },
        condition: { 
            type: String,
            enum: ["new", "used"], 
            default: "used" 
        },
        brand: { 
            type: String 
        },
        images: { 
            type: [String], 
            default: [] 
        },
        attributes: { 
            color: String, storage: String 
        },
        location: { 
            city: String, area: String 
        },
        userId: { 
            type: String, required: true 
        },
        status: { 
            type: String, default: "active" 
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

productSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

module.exports = mongoose.model("Product", productSchema);