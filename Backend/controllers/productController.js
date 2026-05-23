const Product = require("../models/Product");

//Get Product By ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    GET ALL PRODUCTS
const getProducts = async (req, res) => {
    try {
        // تأكدي أن حقل status موجود في الـ Schema، إذا لم يكن موجوداً احذفي الفلتر
        const products = await Product.find({}).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// في productController.js
const getMyProducts = async (req, res) => {
    try {
        // يجلب المنتجات الخاصة باليوزر الذي أرسل الـ Token فقط
        const products = await Product.find({ userId: req.user.id });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    GET USER PRODUCTS
const getUserProducts = async (req, res) => {
    try {
        const products = await Product.find({ userId: req.params.userId });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    CREATE PRODUCT (النسخة المعدلة)
// const createProduct = async (req, res) => {
//     try {

//         const { 
//             title, description, price, categoryId, 
//             dynamicAttributes, images, location, 
//             phoneNumber, showContactInfo, userId 
//         } = req.body;


//         if (!title || !price || !categoryId || !location || !phoneNumber || !userId) {
//             return res.status(400).json({
//                 message: "Please provide all required fields (title, price, categoryId, location, phoneNumber, userId)",
//             });
//         }


//         const product = await Product.create({
//             title,
//             description,
//             price,
//             categoryId,
//             dynamicAttributes, 
//             images: images || [],
//             location,
//             phoneNumber,
//             showContactInfo: showContactInfo ?? true, 
//             userId
//         });

//         res.status(201).json({
//             message: "Product Created Successfully",
//             product,
//         });
//     } catch (error) {
//         console.error("Error creating product:", error);
//         res.status(500).json({ message: error.message || "Server Error" });
//     }
// };

// controllers/productController.js

const createProduct = async (req, res) => {
    try {
        const { title, description, price, categoryId, dynamicAttributes, images, location, phoneNumber, showContactInfo } = req.body;

        // التحقق من الحقول الأساسية
        if (!title || !price || !categoryId || !location || !phoneNumber) {
            return res.status(400).json({ message: "Please provide all required fields" });
        }

        // إنشاء المنتج مع ربطه بـ req.user.id
        const product = await Product.create({
            title,
            description,
            price,
            categoryId,
            dynamicAttributes,
            images: images || [],
            location,
            phoneNumber,
            showContactInfo: showContactInfo ?? true,
            userId: req.user.id // <-- الربط الصحيح هنا
        });

        res.status(201).json({ message: "Product Created Successfully", product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    UPDATE PRODUCT
// const updateProduct = async (req, res) => {
//     try {
//         const productId = req.params.id;

//         // استخدام req.body مباشرة سيعمل إذا كان الـ Front-end يرسل البيانات بنفس أسماء الـ Schema
//         const updatedProduct = await Product.findByIdAndUpdate(
//             productId,
//             req.body,
//             { new: true, runValidators: true }
//         );

//         if (!updatedProduct) {
//             return res.status(404).json({ message: "Product not found" });
//         }

//         res.json({
//             message: "Product Updated Successfully",
//             product: updatedProduct
//         });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // 1. البحث عن المنتج أولاً للتأكد من وجوده ولمعرفة صاحبه
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // 2. التحقق من الملكية (Authorization)
        // نقارن الـ userId الخاص بالمنتج مع الـ ID للمستخدم المسجل (القادم من الـ Middleware)
        if (product.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to update this product" });
        }

        // 3. تحديد الحقول المسموح بتعديلها فقط (Security Best Practice)
        // هذا يمنع أي مستخدم من تغيير الـ userId أو بيانات النظام
        const allowedUpdates = {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            categoryId: req.body.categoryId,
            dynamicAttributes: req.body.dynamicAttributes,
            images: req.body.images,
            location: req.body.location,
            phoneNumber: req.body.phoneNumber,
            showContactInfo: req.body.showContactInfo
        };

        // تحديث المنتج بالبيانات الجديدة فقط
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        );

        res.json({
            message: "Product Updated Successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    DELETE PRODUCT
// const deleteProduct = async (req, res) => {
//     try {
//         const deletedProduct = await Product.findByIdAndDelete(req.params.id);
//         if (!deletedProduct) {
//             return res.status(404).json({ message: "Product not found" });
//         }
//         res.json({ message: "Product Deleted Successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Server Error" });
//     }
// };
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) return res.status(404).json({ message: "Product not found" });

        // التأكد من أن المستخدم الحالي هو صاحب المنتج
        if (product.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this product" });
        }

        await product.deleteOne(); // أو findByIdAndDelete
        res.json({ message: "Product Deleted Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getProducts,
    getUserProducts,
    createProduct,
    getMyProducts,
    updateProduct,
    deleteProduct,
    getProductById
};