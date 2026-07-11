const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    createOrder,
    getOrdersByUser,
    getOrderById,
    updateOrder,
    validateCoupon,
    getRandomActiveCoupon,
    disputeOrder,
} = require("../controllers/orderController");

router.post("/", authMiddleware, createOrder);
router.post("/validate-coupon", authMiddleware, validateCoupon);
router.get("/", authMiddleware, getOrdersByUser);
router.get("/scratch/get-coupon", authMiddleware, getRandomActiveCoupon);
router.get("/:id", authMiddleware, getOrderById);
router.patch("/:id", authMiddleware, updateOrder);
router.post("/:id/dispute", authMiddleware, disputeOrder);

module.exports = router;
