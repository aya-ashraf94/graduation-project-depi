const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationController");

// All notification routes require authentication
router.use(authMiddleware);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.post("/read-all", markAllAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
