const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { requestRefund, getMyRefundRequests, adminGetRefundRequests, adminProcessRefund } = require("../controllers/refundController");

router.post("/", authMiddleware, requestRefund);
router.get("/", authMiddleware, getMyRefundRequests);
router.get("/admin", authMiddleware, adminMiddleware, adminGetRefundRequests);
router.put("/admin/:id", authMiddleware, adminMiddleware, adminProcessRefund);

module.exports = router;