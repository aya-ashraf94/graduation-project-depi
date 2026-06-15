const User = require("../models/User");
const Product = require("../models/Product");
const Report = require("../models/Report");
const Order = require("../models/Order");
const Category = require("../models/Category");

// GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const openReports = await Report.countDocuments();
        
        const totalOrders = await Order.countDocuments();

        res.json({
            totalUsers,
            totalProducts,
            openReports,
            totalOrders
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            users,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// PATCH /api/admin/users/:id
const patchUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isVerified, role, isSuspended } = req.body;
        
        const updateData = {};
        if (isVerified !== undefined) updateData.isVerified = isVerified;
        if (role !== undefined) updateData.role = role;
        if (isSuspended !== undefined) updateData.isSuspended = isSuspended;

        const user = await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.id === id) {
            return res.status(400).json({ message: "You cannot delete your own admin account." });
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete all products belonging to this user
        await Product.deleteMany({ userId: id });

        res.json({ message: "User and their listings deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/admin/products
const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const categoryName = req.query.category;
        const skip = (page - 1) * limit;

        const query = {};
        if (status) query.status = status;

        if (categoryName) {
            const matchingCategories = await Category.find({ name: new RegExp(categoryName, 'i') });
            const catIds = matchingCategories.map(c => c._id);
            if (catIds.length > 0) {
                query.categoryId = { $in: catIds };
            }
        }

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .populate("userId", "name email avatar")
            .populate("categoryId", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            products,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// PATCH /api/admin/products/:id
const patchProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { isVerified, status } = req.body;

        const updateData = {};
        if (isVerified !== undefined) updateData.isVerified = isVerified;
        if (status !== undefined) updateData.status = status;

        const product = await Product.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).populate("userId", "name email avatar").populate("categoryId", "name");

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// DELETE /api/admin/products/:id
const deleteAnyProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Clean up associated reports
        await Report.deleteMany({ productId: id });

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/admin/reports
const getReports = async (req, res) => {
    try {
        const reports = await Report.find()
            .populate({
                path: "productId",
                populate: {
                    path: "userId",
                    select: "name email"
                }
            })
            .populate("reporterId", "name email")
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (error) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/admin/orders
const getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const skip = (page - 1) * limit;

        const query = {};
        if (status) query.status = status;

        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate("productId", "title thumbnail price")
            .populate("buyerId", "name email")
            .populate("sellerId", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            orders,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// DELETE /api/admin/reports/:id
const deleteReport = async (req, res) => {
    try {
        const { id } = req.params;

        const report = await Report.findByIdAndDelete(id);
        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        res.json({ message: "Report dismissed successfully" });
    } catch (error) {
        console.error("Error dismissing report:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getStats,
    getUsers,
    patchUser,
    deleteUser,
    getAllProducts,
    patchProduct,
    deleteAnyProduct,
    getReports,
    deleteReport,
    getAllOrders
};
