const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
    getDashboard,
    getStats,
    getUsers,
    patchUser,
    deleteUser,
    getAllProducts,
    patchProduct,
    deleteAnyProduct,
    getReports,
    deleteReport,
    resolveReport,
    getAllOrders,
    updateOrderStatus,
    getCoupons,
    createCoupon,
    patchCoupon,
    deleteCoupon
} = require("../controllers/adminController");
const {
    getAllFlashSales,
    createFlashSale,
    updateFlashSale,
    deleteFlashSale,
} = require("../controllers/flashSaleController");
const { adminGetRefundRequests, adminProcessRefund } = require("../controllers/refundController");
const { adminSetFeaturedPrice } = require("../controllers/featuredController");
const { adminCreateTier, adminUpdateTier, adminDeleteTier } = require("../controllers/tierController");
const { getAutoPayoutSettings, updateAutoPayoutSettings, processAutoPayouts } = require("../controllers/payoutController");

// Apply auth and admin middleware to all routes below
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/dashboard", getDashboard);
router.get("/stats", getStats);

router.get("/users", getUsers);
router.patch("/users/:id", patchUser);
router.delete("/users/:id", deleteUser);

router.get("/products", getAllProducts);
router.patch("/products/:id", patchProduct);
router.delete("/products/:id", deleteAnyProduct);

router.get("/reports", getReports);
router.patch("/reports/:id/resolve", resolveReport);
router.delete("/reports/:id", deleteReport);

router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);

router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", patchCoupon);
router.delete("/coupons/:id", deleteCoupon);

router.get("/flash-sales", getAllFlashSales);
router.post("/flash-sales", createFlashSale);
router.patch("/flash-sales/:id", updateFlashSale);
router.delete("/flash-sales/:id", deleteFlashSale);

// Refund management
router.get("/refunds", adminGetRefundRequests);
router.put("/refunds/:id", adminProcessRefund);

// Featured listings pricing
router.put("/featured-prices", adminSetFeaturedPrice);

// Seller tier management
router.post("/tiers", adminCreateTier);
router.put("/tiers/:id", adminUpdateTier);
router.delete("/tiers/:id", adminDeleteTier);

// Auto-payout settings
router.get("/auto-payout", getAutoPayoutSettings);
router.put("/auto-payout", updateAutoPayoutSettings);
router.post("/auto-payout/process", processAutoPayouts);

module.exports = router;
