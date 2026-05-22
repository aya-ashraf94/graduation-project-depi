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
const createProduct = async (req, res) => {
    try {
        // استخراج البيانات الجديدة بناءً على الـ Schema
        const { 
            title, description, price, categoryId, 
            dynamicAttributes, images, location, 
            phoneNumber, showContactInfo, userId 
        } = req.body;

        // التحقق من الحقول الإجبارية (Required Fields)
        if (!title || !price || !categoryId || !location || !phoneNumber || !userId) {
            return res.status(400).json({
                message: "Please provide all required fields (title, price, categoryId, location, phoneNumber, userId)",
            });
        }

        // إنشاء المنتج الجديد
        const product = await Product.create({
            title,
            description,
            price,
            categoryId,
            dynamicAttributes, // هذا الحقل سيخزن الـ Map (البراند، اللون، إلخ)
            images: images || [],
            location,
            phoneNumber,
            showContactInfo: showContactInfo ?? true, // القيمة الافتراضية
            userId
        });

        res.status(201).json({
            message: "Product Created Successfully",
            product,
        });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    UPDATE PRODUCT
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // استخدام req.body مباشرة سيعمل إذا كان الـ Front-end يرسل البيانات بنفس أسماء الـ Schema
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({
            message: "Product Updated Successfully",
            product: updatedProduct
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    DELETE PRODUCT
const deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product Deleted Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getProducts,
    getUserProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById
};