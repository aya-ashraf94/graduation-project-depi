const db = require("../db");
const { offers, products, notifications, conversations, conversationParticipants, messages, users, orders } = require("../db/schema");
const { eq, and, or, desc, sql } = require("drizzle-orm");
const { findOrCreateConversation } = require("../utils/conversations");
const { emitMessage, emitToConversation } = require("../utils/socket");
const { createNotification } = require("../utils/notifications");
const { isAuthorizedForOfferAction } = require("../utils/offers");

const checkAndExpireOffer = async (offer) => {
  if (!offer) return offer;

  const [order] = await db.select().from(orders).where(eq(orders.offerId, offer.id)).limit(1);
  const offerWithOrder = { ...offer, orderId: order ? order.id : null };

  if (offer.status === "accepted" && offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
    if (order) return offerWithOrder;

    const [updated] = await db.update(offers)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(offers.id, offer.id))
      .returning();

    const [product] = await db.select({ status: products.status }).from(products).where(eq(products.id, offer.productId)).limit(1);
    if (product && product.status === "reserved") {
      await db.update(products)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(products.id, offer.productId));
    }
    return { ...updated, productTitle: offer.productTitle, orderId: null };
  }
  return offerWithOrder;
};

const makeOffer = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { productId, amount, conversationId: reqConvId } = req.body;

    if (!productId || !amount) {
      return res.status(400).json({ message: "Product ID and amount are required" });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.userId === buyerId) return res.status(400).json({ message: "You cannot make an offer on your own product" });

    let conversationId = reqConvId;
    if (!conversationId) {
      conversationId = await findOrCreateConversation(buyerId, product.userId, productId);
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const [newOffer] = await db.insert(offers).values({
      productId, buyerId, sellerId: product.userId,
      amount: Number(amount), status: "pending", conversationId, expiresAt,
    }).returning();

    const [msg] = await db.insert(messages).values({
      conversationId, senderId: buyerId,
      content: `Sent an offer of $${amount}`,
      status: "sent", type: "offer",
      metadata: { offerId: newOffer.id, offerAmount: Number(amount), offerStatus: "pending" },
    }).returning();

    await db.update(conversations).set({ lastMessageId: msg.id, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    emitMessage(req, conversationId, {
      id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId,
      content: msg.content, status: msg.status, type: msg.type,
      metadata: msg.metadata, sentAt: msg.createdAt,
    });

    const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, buyerId)).limit(1);
    const senderName = sender ? sender.name : "A user";
    await createNotification({
      userId: product.userId, type: "message", title: "New Offer Received 💸",
      body: `${senderName} made an offer of $${amount} on "${product.title}"`,
      linkedRoute: "/chat", linkedEntityId: conversationId,
    });

    res.status(201).json({ message: "Offer submitted successfully", offer: newOffer, conversationId });
  } catch (error) {
    console.error("Error making offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getOffers = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawOffers = await db.select({
      id: offers.id, productId: offers.productId, buyerId: offers.buyerId,
      sellerId: offers.sellerId, amount: offers.amount, status: offers.status,
      conversationId: offers.conversationId, expiresAt: offers.expiresAt,
      counterAmount: offers.counterAmount, createdAt: offers.createdAt,
      updatedAt: offers.updatedAt, productTitle: products.title,
    }).from(offers).leftJoin(products, eq(offers.productId, products.id))
      .where(or(eq(offers.buyerId, userId), eq(offers.sellerId, userId)))
      .orderBy(desc(offers.createdAt));

    const result = [];
    for (const offer of rawOffers) result.push(await checkAndExpireOffer(offer));
    res.json(result);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    let [offer] = await db.select({
      id: offers.id, productId: offers.productId, buyerId: offers.buyerId,
      sellerId: offers.sellerId, amount: offers.amount, status: offers.status,
      conversationId: offers.conversationId, expiresAt: offers.expiresAt,
      counterAmount: offers.counterAmount, createdAt: offers.createdAt,
      updatedAt: offers.updatedAt, productTitle: products.title,
    }).from(offers).leftJoin(products, eq(offers.productId, products.id))
      .where(eq(offers.id, id)).limit(1);

    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.buyerId !== userId && offer.sellerId !== userId)
      return res.status(403).json({ message: "Not authorized to view this offer" });

    offer = await checkAndExpireOffer(offer);
    res.json(offer);
  } catch (error) {
    console.error("Error fetching single offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const acceptOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.status !== "pending" && offer.status !== "countered")
      return res.status(400).json({ message: `Cannot accept offer with status ${offer.status}` });
    if (offer.expiresAt && new Date() > new Date(offer.expiresAt))
      return res.status(400).json({ message: "Offer has expired" });

    const [product] = await db.select().from(products).where(eq(products.id, offer.productId)).limit(1);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.status !== "active") return res.status(400).json({ message: `Product is currently ${product.status}` });

    const isAllowed = await isAuthorizedForOfferAction(offer, userId);
    if (!isAllowed) return res.status(403).json({ message: "You are not authorized to accept this offer" });

    const checkoutExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [updatedOffer] = await db.update(offers)
      .set({ status: "accepted", expiresAt: checkoutExpiry, updatedAt: new Date() })
      .where(eq(offers.id, id)).returning();

    await db.update(products).set({ status: "reserved", updatedAt: new Date() })
      .where(eq(products.id, offer.productId));

    const recipientId = userId === offer.sellerId ? offer.buyerId : offer.sellerId;
    const finalAmount = offer.status === "countered" ? offer.counterAmount : offer.amount;

    const [msg] = await db.insert(messages).values({
      conversationId: offer.conversationId, senderId: userId,
      content: `✅ Offer accepted for $${finalAmount}!`,
      status: "sent", type: "system",
      metadata: { offerId: offer.id, offerAmount: Number(finalAmount), offerStatus: "accepted", expiresAt: checkoutExpiry },
    }).returning();

    await db.update(conversations).set({ lastMessageId: msg.id, updatedAt: new Date() })
      .where(eq(conversations.id, offer.conversationId));

    const formattedMsg = { id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, content: msg.content, status: msg.status, type: msg.type, metadata: msg.metadata, sentAt: msg.createdAt };
    emitMessage(req, offer.conversationId, formattedMsg);
    emitToConversation(req, offer.conversationId, "offer_status_changed", updatedOffer);
    emitToConversation(req, offer.conversationId, "offer_accepted_checkout", { offerId: offer.id, productId: offer.productId, finalAmount: Number(finalAmount) });

    const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const senderName = sender ? sender.name : "A user";
    await createNotification({
      userId: recipientId, type: "message", title: "Offer Accepted! 🎉",
      body: `${senderName} accepted the offer of $${finalAmount}. You have 2 hours to checkout before it expires!`,
      linkedRoute: "/chat", linkedEntityId: offer.conversationId,
    });

    res.json(updatedOffer);
  } catch (error) {
    console.error("Error accepting offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const rejectOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.status !== "pending" && offer.status !== "countered")
      return res.status(400).json({ message: `Cannot reject offer with status ${offer.status}` });

    const isAllowed = await isAuthorizedForOfferAction(offer, userId);
    if (!isAllowed) return res.status(403).json({ message: "You are not authorized to reject this offer" });

    const [updatedOffer] = await db.update(offers)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(offers.id, id)).returning();

    const recipientId = userId === offer.sellerId ? offer.buyerId : offer.sellerId;

    const [msg] = await db.insert(messages).values({
      conversationId: offer.conversationId, senderId: userId,
      content: `❌ Offer declined.`,
      status: "sent", type: "system",
      metadata: { offerId: offer.id, offerStatus: "rejected" },
    }).returning();

    await db.update(conversations).set({ lastMessageId: msg.id, updatedAt: new Date() })
      .where(eq(conversations.id, offer.conversationId));

    const formattedMsg = { id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, content: msg.content, status: msg.status, type: msg.type, metadata: msg.metadata, sentAt: msg.createdAt };
    emitMessage(req, offer.conversationId, formattedMsg);
    emitToConversation(req, offer.conversationId, "offer_status_changed", updatedOffer);

    const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const senderName = sender ? sender.name : "A user";
    await createNotification({
      userId: recipientId, type: "message", title: "Offer Declined ❌",
      body: `${senderName} declined the offer`,
      linkedRoute: "/chat", linkedEntityId: offer.conversationId,
    });

    res.json(updatedOffer);
  } catch (error) {
    console.error("Error rejecting offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const counterOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { counterAmount } = req.body;

    if (!counterAmount) return res.status(400).json({ message: "Counter amount is required" });

    const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.status !== "pending" && offer.status !== "countered")
      return res.status(400).json({ message: `Cannot counter offer with status ${offer.status}` });

    const isAllowed = await isAuthorizedForOfferAction(offer, userId);
    if (!isAllowed) return res.status(403).json({ message: "You are not authorized to counter this offer" });
    if (offer.expiresAt && new Date() > new Date(offer.expiresAt))
      return res.status(400).json({ message: "Offer has expired" });

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const [updatedOffer] = await db.update(offers)
      .set({ status: "countered", counterAmount: Number(counterAmount), expiresAt, updatedAt: new Date() })
      .where(eq(offers.id, id)).returning();

    const [msg] = await db.insert(messages).values({
      conversationId: offer.conversationId, senderId: userId,
      content: `Proposed counter-offer of $${counterAmount}`,
      status: "sent", type: "counter_offer",
      metadata: { offerId: offer.id, offerAmount: Number(offer.amount), counterAmount: Number(counterAmount), offerStatus: "countered" },
    }).returning();

    await db.update(conversations).set({ lastMessageId: msg.id, updatedAt: new Date() })
      .where(eq(conversations.id, offer.conversationId));

    const formattedMsg = { id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, content: msg.content, status: msg.status, type: msg.type, metadata: msg.metadata, sentAt: msg.createdAt };
    emitMessage(req, offer.conversationId, formattedMsg);
    emitToConversation(req, offer.conversationId, "offer_status_changed", updatedOffer);

    const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const senderName = sender ? sender.name : "The seller";
    await createNotification({
      userId: offer.buyerId, type: "message", title: "Counter-offer Proposed 💸",
      body: `${senderName} proposed a counter-offer of $${counterAmount}`,
      linkedRoute: "/chat", linkedEntityId: offer.conversationId,
    });

    res.json(updatedOffer);
  } catch (error) {
    console.error("Error countering offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const processExpiredOffers = async () => {
  try {
    const now = new Date();
    const expiredOffers = await db.select()
      .from(offers)
      .where(and(
        eq(offers.status, "accepted"),
        sql`expires_at IS NOT NULL AND expires_at < ${now}`
      ));

    for (const offer of expiredOffers) {
      await checkAndExpireOffer(offer);
    }

    if (expiredOffers.length > 0) {
      console.log(`[OfferExpiry] Expired ${expiredOffers.length} offer(s)`);
    }
  } catch (error) {
    console.error("[OfferExpiry] Scheduler error:", error.message);
  }
};

module.exports = { makeOffer, getOffers, getOffer, acceptOffer, rejectOffer, counterOffer, checkAndExpireOffer, processExpiredOffers };
