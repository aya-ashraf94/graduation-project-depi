const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  requestPayout,
  getMyPayouts,
  getWalletStats,
  adminGetPayouts,
  adminUpdatePayoutStatus,
} = require("../controllers/payoutController");

// User routes (need auth)
router.post("/", authMiddleware, requestPayout);
router.get("/", authMiddleware, getMyPayouts);
router.get("/stats", authMiddleware, getWalletStats);

// Admin routes (need auth + admin)
router.get("/admin", authMiddleware, adminMiddleware, adminGetPayouts);
router.put("/admin/:id", authMiddleware, adminMiddleware, adminUpdatePayoutStatus);

module.exports = router;
