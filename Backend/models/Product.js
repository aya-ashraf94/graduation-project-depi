const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    // السطر ده هو اللي ناقص عشان يخزن الوصف
    description: { 
        type: String 
    }, 
    price: { 
        type: Number, 
        required: true 
    },
    images: [{ type: String }],
    categoryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    // ده ممتاز زي ما هو وهيشيل (type, material, color, condition)
    dynamicAttributes: {
        type: Map,
        of: mongoose.Schema.Types.Mixed 
    },
    location: { 
        type: String, 
        required: true 
    },
    phoneNumber: { 
        type: String, 
        required: true 
    },
    showContactInfo: { 
        type: Boolean, 
        default: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    soldByNafa3ni: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'reserved', 'sold', 'draft'],
        default: 'active'
    },
    viewCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Optimize query performance with indexes
productSchema.index({ categoryId: 1 });
productSchema.index({ userId: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);