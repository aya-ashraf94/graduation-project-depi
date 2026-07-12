const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { getTiers, getActiveTiers, adminCreateTier, adminUpdateTier, adminDeleteTier, subscribeToTier, getMySubscription, cancelSubscription, toggleAutoRenew, createSubscriptionPaymentIntent, confirmSubscriptionPayment } = require("../controllers/tierController");

router.get("/", getTiers);
router.get("/active", getActiveTiers);
router.post("/subscribe", authMiddleware, subscribeToTier);
router.get("/my", authMiddleware, getMySubscription);
router.patch("/cancel", authMiddleware, cancelSubscription);
router.patch("/auto-renew", authMiddleware, toggleAutoRenew);
router.post("/create-subscription-payment-intent", authMiddleware, createSubscriptionPaymentIntent);
router.post("/confirm-subscription", authMiddleware, confirmSubscriptionPayment);
router.post("/admin", authMiddleware, adminMiddleware, adminCreateTier);
router.put("/admin/:id", authMiddleware, adminMiddleware, adminUpdateTier);
router.delete("/admin/:id", authMiddleware, adminMiddleware, adminDeleteTier);

module.exports = router;