const express = require('express');
const router = express.Router();
const Category = require('../models/Category'); // تأكدي من مسار الموديل

// 1. الحصول على كل الأقسام (عشان تعرضيهم في الـ Navbar أو الـ Select)
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. إضافة قسم جديد (مع الـ Attributes بتاعته)
router.post('/', async (req, res) => {
    const category = new Category({
        name: req.body.name,
        attributes: req.body.attributes // هنا بنبعت الـ Array اللي فيه الـ select والـ radio
    });

    try {
        const newCategory = await category.save();
        res.status(201).json(newCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. مسح قسم معين (لو حبيتي تنظفي الداتا بيز)
router.delete('/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;