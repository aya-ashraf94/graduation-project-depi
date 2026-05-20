const Product = require("../models/Product");

// @desc    GET ALL PRODUCTS
// @route   GET /api/products
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ status: "active" }).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    GET USER PRODUCTS (لصفحة البروفايل في Angular)
// @route   GET /api/products/user/:userId
const getUserProducts = async (req, res) => {
    try {
        const products = await Product.find({ userId: req.params.userId });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    CREATE PRODUCT
// @route   POST /api/products
const createProduct = async (req, res) => {
    try {
        const { 
            title, description, price, categoryId, 
            condition, brand, images, attributes, 
            location, userId 
        } = req.body;

        // VALIDATION (تأكدي من الحقول الأساسية)
        if (!title || !price || !description || !userId || !categoryId) {
            return res.status(400).json({
                message: "Please provide all required fields (title, price, description, userId, categoryId)",
            });
        }

        const product = await Product.create({
            title,
            description,
            price,
            categoryId,
            condition: condition || "used",
            brand,
            images: images || [],
            attributes,
            location,
            userId,
            status: "active" // المنتج بينزل متاح فوراً
        });

        res.status(201).json({
            message: "Product Created Successfully",
            product,
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    UPDATE PRODUCT
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            req.body, // بياخد التعديلات اللي جاية من الفورم في Angular
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
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    DELETE PRODUCT (HARD DELETE)
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        const deletedProduct = await Product.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product Deleted Successfully from database" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getProducts,
    getUserProducts,
    createProduct,
    updateProduct,
    deleteProduct
};