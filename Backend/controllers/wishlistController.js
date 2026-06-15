const User = require("../models/User");
const Product = require("../models/Product");

const toggleWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const index = user.wishlist.indexOf(productId);
        let added;

        if (index > -1) {
            user.wishlist.splice(index, 1);
            added = false;
        } else {
            user.wishlist.push(productId);
            added = true;
        }

        await user.save();

        res.json({
            message: added ? "Product added to wishlist" : "Product removed from wishlist",
            added,
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error("Error toggling wishlist:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getWishlistIds = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("wishlist");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user.wishlist);
    } catch (error) {
        console.error("Error fetching wishlist IDs:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getWishlistProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate({
            path: "wishlist",
            populate: { path: "userId", select: "name email avatar isVerified rating" }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Format products to match ProductSummary/Product expected format
        const formattedProducts = user.wishlist.map(p => {
            return {
                id: p._id,
                title: p.title,
                price: p.price,
                images: p.images,
                thumbnail: p.images?.[0] || '',
                brand: p.dynamicAttributes instanceof Map ? p.dynamicAttributes.get("brand") || '' : p.dynamicAttributes?.brand || '',
                condition: p.dynamicAttributes instanceof Map ? p.dynamicAttributes.get("condition") || '' : p.dynamicAttributes?.condition || '',
                status: p.status,
                location: p.location || '',
                seller: p.userId ? {
                    id: p.userId._id,
                    name: p.userId.name,
                    avatar: p.userId.avatar,
                    isVerified: p.userId.isVerified
                } : null,
                sellerId: p.userId?._id || null,
                viewCount: p.viewCount,
                createdAt: p.createdAt
            };
        });

        res.json(formattedProducts);
    } catch (error) {
        console.error("Error fetching wishlist products:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    toggleWishlist,
    getWishlistIds,
    getWishlistProducts
};
