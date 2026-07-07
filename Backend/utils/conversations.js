const db = require("../db");
const { conversations, conversationParticipants } = require("../db/schema");
const { eq, or } = require("drizzle-orm");

const findOrCreateConversation = async (userId1, userId2, productId = null) => {
  const existingParts = await db.select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(or(
      eq(conversationParticipants.userId, userId1),
      eq(conversationParticipants.userId, userId2)
    ));

  const convCounts = {};
  existingParts.forEach(p => {
    convCounts[p.conversationId] = (convCounts[p.conversationId] || 0) + 1;
  });

  for (const [cid, count] of Object.entries(convCounts)) {
    if (count >= 2) {
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, cid)).limit(1);
      if (conv) {
        if (!productId || conv.productId === productId) {
          return cid;
        }
      }
    }
  }

  const [conv] = await db.insert(conversations).values({
    productId: productId || null,
  }).returning();

  await db.insert(conversationParticipants).values([
    { conversationId: conv.id, userId: userId1 },
    { conversationId: conv.id, userId: userId2 },
  ]);

  return conv.id;
};

module.exports = { findOrCreateConversation };
