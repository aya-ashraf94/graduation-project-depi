const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 });

        const formatted = notifications.map(n => ({
            id: n._id,
            userId: n.userId,
            type: n.type,
            title: n.title,
            body: n.body,
            isRead: n.isRead,
            linkedEntityId: n.linkedEntityId,
            linkedRoute: n.linkedRoute,
            createdAt: n.createdAt
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await Notification.findOne({ _id: id, userId });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        notification.isRead = true;
        await notification.save();

        res.json({
            message: "Notification marked as read",
            notification: {
                id: notification._id,
                isRead: notification.isRead
            }
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await Notification.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({ _id: id, userId });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
