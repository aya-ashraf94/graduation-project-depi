const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
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
    updateOrderStatus
} = require("../controllers/adminController");

// Apply auth and admin middleware to all routes below
router.use(authMiddleware);
router.use(adminMiddleware);

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

module.exports = router;
