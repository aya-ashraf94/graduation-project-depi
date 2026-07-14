const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  promoteProduct,
  getPromotionPrices,
  getActiveFeatured,
  getMyFeaturedListings,
  adminSetFeaturedPrice,
  getRemainingFeaturedQuota,
  createPromotionPaymentIntent,
  confirmPromotionPayment
} = require("../controllers/featuredController");

router.post("/promote", authMiddleware, promoteProduct);
router.post("/create-promotion-payment-intent", authMiddleware, createPromotionPaymentIntent);
router.post("/confirm-promotion-payment", authMiddleware, confirmPromotionPayment);
router.get("/prices", getPromotionPrices);
router.get("/active", getActiveFeatured);
router.get("/my", authMiddleware, getMyFeaturedListings);
router.get("/remaining", authMiddleware, getRemainingFeaturedQuota);
router.put("/admin/prices", authMiddleware, adminMiddleware, adminSetFeaturedPrice);

module.exports = router;