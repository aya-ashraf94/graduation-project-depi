const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { promoteProduct, getPromotionPrices, getActiveFeatured, getMyFeaturedListings, adminSetFeaturedPrice } = require("../controllers/featuredController");

router.post("/promote", authMiddleware, promoteProduct);
router.get("/prices", getPromotionPrices);
router.get("/active", getActiveFeatured);
router.get("/my", authMiddleware, getMyFeaturedListings);
router.put("/admin/prices", authMiddleware, adminMiddleware, adminSetFeaturedPrice);

module.exports = router;