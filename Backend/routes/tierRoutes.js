const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { getTiers, getActiveTiers, adminCreateTier, adminUpdateTier, adminDeleteTier, subscribeToTier, getMySubscription, cancelSubscription } = require("../controllers/tierController");

router.get("/", getTiers);
router.get("/active", getActiveTiers);
router.post("/subscribe", authMiddleware, subscribeToTier);
router.get("/my", authMiddleware, getMySubscription);
router.delete("/cancel", authMiddleware, cancelSubscription);
router.post("/admin", authMiddleware, adminMiddleware, adminCreateTier);
router.put("/admin/:id", authMiddleware, adminMiddleware, adminUpdateTier);
router.delete("/admin/:id", authMiddleware, adminMiddleware, adminDeleteTier);

module.exports = router;