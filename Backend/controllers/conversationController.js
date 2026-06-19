const db = require("../db");
const { conversations, conversationParticipants, messages, users, notifications, products } = require("../db/schema");
const { eq, and, ne, desc, inArray, sql } = require("drizzle-orm");

const assertParticipant = async (userId, conversationId) => {
  const [entry] = await db.select()
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId)
    ))
    .limit(1);
  return !!entry;
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const participantRows = await db.select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const convIds = participantRows.map(p => p.conversationId);

    if (convIds.length === 0) {
      return res.json([]);
    }

    const convs = await db.select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .leftJoin(products, eq(conversations.productId, products.id))
      .orderBy(desc(conversations.updatedAt));

    const lastMsgIds = convs.map(c => c.conversations.lastMessageId).filter(Boolean);
    let lastMsgMap = {};
    if (lastMsgIds.length > 0) {
      const lastMsgs = await db.select()
        .from(messages)
        .where(inArray(messages.id, lastMsgIds));
      lastMsgMap = Object.fromEntries(lastMsgs.map(m => [m.id, m]));
    }

    const unreadRows = await db.select({
      conversationId: messages.conversationId,
      value: sql`count(*)::int`,
    }).from(messages)
      .where(
        and(
          inArray(messages.conversationId, convIds),
          ne(messages.senderId, userId),
          ne(messages.status, 'read')
        )
      ).groupBy(messages.conversationId);
    const unreadMap = Object.fromEntries(
      unreadRows.map(r => [r.conversationId, Number(r.value)])
    );

    const allParts = await db.select()
      .from(conversationParticipants)
      .where(inArray(conversationParticipants.conversationId, convIds))
      .leftJoin(users, eq(conversationParticipants.userId, users.id));

    const partsByConv = {};
    allParts.forEach(p => {
      const cid = p.conversation_participants.conversationId;
      if (!partsByConv[cid]) partsByConv[cid] = [];
      partsByConv[cid].push(p);
    });

    const result = convs.map((row) => {
      const conv = row.conversations;
      const parts = partsByConv[conv.id] || [];

      const participantsFormatted = parts.map(p => {
        const u = p.users;
        const nameParts = (u?.name || '').trim().split(/\s+/);
        return {
          id: u.id,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.email}`,
          isVerified: u.isVerified || false,
          rating: u.rating || 5.0,
        };
      });

      let lastMsgData = null;
      if (conv.lastMessageId && lastMsgMap[conv.lastMessageId]) {
        const m = lastMsgMap[conv.lastMessageId];
        lastMsgData = {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          content: m.content,
          status: m.status,
          sentAt: m.createdAt,
        };
      }

      return {
        id: conv.id,
        participants: participantsFormatted,
        productId: row.products?.id,
        productTitle: row.products?.title,
        productPrice: row.products?.price,
        productThumbnail: (row.products?.images || [])[0],
        lastMessage: lastMsgData,
        unreadCount: unreadMap[conv.id] || 0,
        updatedAt: conv.updatedAt,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const isParticipant = await assertParticipant(req.user.id, conversationId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }
    const msgs = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    const result = msgs.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      status: m.status,
      sentAt: m.createdAt,
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

    const existingParts = await db.select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(inArray(conversationParticipants.userId, [currentUserId, recipientId]));

    const convCounts = {};
    existingParts.forEach(p => {
      convCounts[p.conversationId] = (convCounts[p.conversationId] || 0) + 1;
    });

    let conversationId = null;
    for (const [cid, count] of Object.entries(convCounts)) {
      if (count >= 2) {
        if (productId) {
          const [conv] = await db.select().from(conversations).where(eq(conversations.id, cid)).limit(1);
          if (conv && conv.productId === productId) {
            conversationId = cid;
            break;
          }
        } else {
          conversationId = cid;
          break;
        }
      }
    }

    if (!conversationId) {
      const [conv] = await db.insert(conversations).values({
        productId: productId || null,
      }).returning();

      conversationId = conv.id;

      await db.insert(conversationParticipants).values([
        { conversationId: conv.id, userId: currentUserId },
        { conversationId: conv.id, userId: recipientId },
      ]);
    }

    if (initialMessage && initialMessage.trim()) {
      const [msg] = await db.insert(messages).values({
        conversationId,
        senderId: currentUserId,
        content: initialMessage,
        status: "sent",
      }).returning();

      await db.update(conversations).set({
        lastMessageId: msg.id,
        updatedAt: new Date(),
      }).where(eq(conversations.id, conversationId));

      try {
        const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, currentUserId)).limit(1);
        const senderName = sender ? sender.name : "A user";
        await db.insert(notifications).values({
          userId: recipientId,
          type: "message",
          title: "New Message",
          body: `${senderName} sent you a message: "${initialMessage.substring(0, 40)}${initialMessage.length > 40 ? '...' : ''}"`,
          linkedEntityId: conversationId,
          linkedRoute: "/chat",
        });
      } catch (notifErr) {
        console.error("Error triggering initial message notification:", notifErr);
      }
    }

    res.status(201).json({ conversationId });
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

    const isParticipant = await assertParticipant(senderId, conversationId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }

    const [msg] = await db.insert(messages).values({
      conversationId,
      senderId,
      content,
      status: "sent",
    }).returning();

    await db.update(conversations).set({
      lastMessageId: msg.id,
      updatedAt: new Date(),
    }).where(eq(conversations.id, conversationId));

    try {
      const parts = await db.select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversationId));

      const recipientId = parts.find(p => p.userId !== senderId)?.userId;
      if (recipientId) {
        const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, senderId)).limit(1);
        const senderName = sender ? sender.name : "A user";
        await db.insert(notifications).values({
          userId: recipientId,
          type: "message",
          title: "New Message",
          body: `${senderName} sent you a message: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`,
          linkedEntityId: conversationId,
          linkedRoute: "/chat",
        });
      }
    } catch (notifErr) {
      console.error("Error triggering message notification:", notifErr);
    }

    const formattedMsg = {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      status: msg.status,
      sentAt: msg.createdAt,
    };

    // Emit live message event through Socket.io to conversation room
    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("new_message", formattedMsg);
    }

    res.status(201).json(formattedMsg);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const isParticipant = await assertParticipant(userId, conversationId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }

    await db.update(messages).set({ status: "read" })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId),
          ne(messages.status, 'read')
        )
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
  markAsRead,
};
