const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const conversations = await Conversation.find({
            participants: userId
        })
        .populate("participants", "name email avatar isVerified rating")
        .populate("productId", "title price images")
        .populate({
            path: "lastMessage",
            populate: { path: "senderId", select: "name" }
        })
        .sort({ updatedAt: -1 });

        const result = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                senderId: { $ne: userId },
                status: { $ne: "read" }
            });
            
            const convObj = conv.toObject();
            
            const participantsFormatted = (convObj.participants || []).map(p => {
                const nameParts = (p.name || '').trim().split(/\s+/);
                return {
                    id: p._id,
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    avatar: p.avatar || `https://i.pravatar.cc/150?u=${p.email}`,
                    isVerified: p.isVerified || false,
                    rating: p.rating || 5.0
                };
            });

            return {
                id: convObj._id,
                participants: participantsFormatted,
                productId: convObj.productId?._id,
                productTitle: convObj.productId?.title,
                productPrice: convObj.productId?.price,
                productThumbnail: convObj.productId?.images?.[0],
                lastMessage: convObj.lastMessage ? {
                    id: convObj.lastMessage._id,
                    conversationId: convObj.lastMessage.conversationId,
                    senderId: convObj.lastMessage.senderId?._id || convObj.lastMessage.senderId,
                    content: convObj.lastMessage.content,
                    status: convObj.lastMessage.status,
                    sentAt: convObj.lastMessage.createdAt
                } : undefined,
                unreadCount,
                updatedAt: convObj.updatedAt
            };
        }));
        
        res.json(result);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 });
            
        const result = messages.map(m => ({
            id: m._id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            content: m.content,
            status: m.status,
            sentAt: m.createdAt
        }));
        
        res.json(result);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const startConversation = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { recipientId, productId, initialMessage } = req.body;
        
        if (!recipientId) {
            return res.status(400).json({ message: "Recipient ID is required" });
        }
        
        const query = {
            participants: { $all: [currentUserId, recipientId] }
        };
        if (productId) {
            query.productId = productId;
        }
        
        let conversation = await Conversation.findOne(query);
        
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [currentUserId, recipientId],
                productId: productId || null
            });
        }
        
        if (initialMessage && initialMessage.trim()) {
            const msg = await Message.create({
                conversationId: conversation._id,
                senderId: currentUserId,
                content: initialMessage,
                status: "sent"
            });
            conversation.lastMessage = msg._id;
            await conversation.save();
        }
        
        res.status(201).json({ conversationId: conversation._id });
    } catch (error) {
        console.error("Error starting conversation:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { conversationId, content } = req.body;
        
        if (!conversationId || !content) {
            return res.status(400).json({ message: "Conversation ID and content are required" });
        }
        
        const msg = await Message.create({
            conversationId,
            senderId,
            content,
            status: "sent"
        });
        
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: msg._id,
            updatedAt: Date.now()
        });
        
        res.status(201).json({
            id: msg._id,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            content: msg.content,
            status: msg.status,
            sentAt: msg.createdAt
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        
        await Message.updateMany(
            { conversationId, senderId: { $ne: userId }, status: { $ne: "read" } },
            { $set: { status: "read" } }
        );
        
        res.json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getConversations,
    getMessages,
    startConversation,
    sendMessage,
    markAsRead
};
