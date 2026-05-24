const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

// إضافة منتج (لازم يكون مسجل دخول)
router.post('/', authMiddleware, productController.createProduct);

router.put('/:id', authMiddleware, productController.updateProduct);

// عرض كل المنتجات
router.get('/', productController.getProducts);

// الحصول على عدد المنتجات لكل فئة
router.get('/counts/by-category', productController.getCategoryCounts);

// عرض منتجات يوزر معين (عشان تظهر في بروفايله)
router.get('/user/:userId', productController.getUserProducts);

// مسح منتج (مسح نهائي حسب طلبك السابق)
router.delete('/:id', authMiddleware, productController.deleteProduct);

//Get Product By ID
router.get('/:id', productController.getProductById);

module.exports = router;
