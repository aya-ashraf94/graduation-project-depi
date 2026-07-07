const db = require("../db");
const { notifications } = require("../db/schema");

const createNotification = async ({ userId, type, title, body, linkedRoute, linkedEntityId, isRead = false }) => {
  try {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      body,
      linkedEntityId: linkedEntityId || "",
      linkedRoute: linkedRoute || "",
      isRead,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

module.exports = { createNotification };
