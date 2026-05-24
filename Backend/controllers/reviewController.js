const Review = require("../models/Review");
const User = require("../models/User");
const Order = require("../models/Order");

const createReview = async (req, res) => {
    try {
        const reviewerId = req.user.id;
        const { orderId, rating, comment } = req.body;
        
        if (!orderId || !rating || !comment) {
            return res.status(400).json({ message: "Please provide orderId, rating, and comment" });
        }
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        const productId = order.productId;
        const revieweeId = (reviewerId === order.buyerId.toString()) ? order.sellerId : order.buyerId;
        
        const existingReview = await Review.findOne({ orderId, reviewerId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this transaction" });
        }
        
        const review = await Review.create({
            orderId,
            reviewerId,
            revieweeId,
            productId,
            rating: Number(rating),
            comment
        });
        
        const reviews = await Review.find({ revieweeId });
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const averageRating = reviews.length > 0 ? (sum / reviews.length) : 5.0;
        const roundedRating = Math.round(averageRating * 10) / 10;
        
        await User.findByIdAndUpdate(revieweeId, {
            rating: roundedRating
        });
        
        res.status(201).json(review);
    } catch (error) {
        console.error("Error creating review:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getReviewsForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const reviews = await Review.find({ revieweeId: userId })
            .populate("reviewerId", "name email avatar")
            .sort({ createdAt: -1 });
            
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews for user:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getReviewsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const reviews = await Review.find({ reviewerId: userId })
            .populate("revieweeId", "name email avatar")
            .sort({ createdAt: -1 });
            
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews written by user:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    createReview,
    getReviewsForUser,
    getReviewsByUser
};
