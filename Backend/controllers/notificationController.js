const db = require("../db");
const { notifications } = require("../db/schema");
const { eq, and, desc } = require("drizzle-orm");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    const formatted = result.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      linkedEntityId: n.linkedEntityId,
      linkedRoute: n.linkedRoute,
      createdAt: n.createdAt,
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

    const [notification] = await db.select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await db.update(notifications).set({ isRead: true })
      .where(eq(notifications.id, id));

    res.json({
      message: "Notification marked as read",
      notification: { id, isRead: true },
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

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

    const [notification] = await db.delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });

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
  deleteNotification,
};
