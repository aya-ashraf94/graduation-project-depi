const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    createReview,
    getReviewsForUser,
    getReviewsByUser
} = require("../controllers/reviewController");

router.post("/", authMiddleware, createReview);
router.get("/user/:userId", getReviewsForUser);
router.get("/written/:userId", getReviewsByUser);

module.exports = router;
