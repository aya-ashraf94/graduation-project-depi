const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // مثل: brand, storage, ram
  type: { type: String, enum: ['select', 'radio', 'text'], required: true },
  options: [String], // مصفوفة الاختيارات
  required: { type: Boolean, default: true },
  hasOther: { type: Boolean, default: false } // دي عشان نهندل الـ Input الإضافي في الفرونت
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  attributes: [attributeSchema]
});

module.exports = mongoose.model('Category', categorySchema);