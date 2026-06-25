const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    getConversations,
    getMessages,
    startConversation,
    sendMessage,
    markAsRead,
    deleteConversation
} = require("../controllers/conversationController");

router.get("/", authMiddleware, getConversations);
router.get("/:conversationId/messages", authMiddleware, getMessages);
router.post("/", authMiddleware, startConversation);
router.post("/messages", authMiddleware, sendMessage);
router.put("/:conversationId/read", authMiddleware, markAsRead);
router.delete("/:conversationId", authMiddleware, deleteConversation);

module.exports = router;
