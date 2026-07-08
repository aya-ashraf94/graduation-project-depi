const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createPaymentIntent,
  confirmPayment,
} = require("../controllers/paymentController");

router.post("/create-payment-intent", authMiddleware, createPaymentIntent);
router.post("/confirm-payment", authMiddleware, confirmPayment);

module.exports = router;
