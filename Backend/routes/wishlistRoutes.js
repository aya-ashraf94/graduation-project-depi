const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    toggleWishlist,
    getWishlistIds,
    getWishlistProducts
} = require("../controllers/wishlistController");

// All wishlist routes require authentication
router.use(authMiddleware);

router.post("/toggle", toggleWishlist);
router.get("/ids", getWishlistIds);
router.get("/", getWishlistProducts);

module.exports = router;
