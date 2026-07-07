const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createCheckoutSession,
  getSessionStatus,
} = require("../controllers/paymentController");

router.post("/create-checkout-session", authMiddleware, createCheckoutSession);
router.get("/session-status/:session_id", authMiddleware, getSessionStatus);

module.exports = router;
