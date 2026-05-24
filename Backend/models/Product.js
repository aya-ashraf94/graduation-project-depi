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
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);