const db = require("../db");
const { messages } = require("../db/schema");
const { eq, and, desc } = require("drizzle-orm");

const isAuthorizedForOfferAction = async (offer, userId) => {
  if (offer.status === "pending") {
    return offer.sellerId === userId;
  }

  if (offer.status === "countered") {
    const [lastCounterMsg] = await db.select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, offer.conversationId),
          eq(messages.type, "counter_offer")
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (lastCounterMsg) {
      if (lastCounterMsg.senderId === offer.sellerId) {
        return offer.buyerId === userId;
      }
      return offer.sellerId === userId;
    }
    return offer.buyerId === userId;
  }

  return false;
};

module.exports = { isAuthorizedForOfferAction };
