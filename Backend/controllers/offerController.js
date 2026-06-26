const db = require("../db");
const { offers, products, notifications, conversations, conversationParticipants, messages, users, orders } = require("../db/schema");
const { eq, and, or, desc } = require("drizzle-orm");

const checkAndExpireOffer = async (offer) => {
  if (!offer) return offer;

  // Check if an order exists for this offer to attach it
  const [order] = await db.select().from(orders).where(eq(orders.offerId, offer.id)).limit(1);
  const offerWithOrder = { ...offer, orderId: order ? order.id : null };

  if (offer.status === "accepted" && offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
    if (order) {
      return offerWithOrder; // Order exists, so not expired
    }

    // Revert offer status to expired
    const [updated] = await db.update(offers)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(offers.id, offer.id))
      .returning();

    // Revert product status to active
    const [product] = await db.select({ status: products.status }).from(products).where(eq(products.id, offer.productId)).limit(1);
    if (product && product.status === "reserved") {
      await db.update(products)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(products.id, offer.productId));
    }
    return {
      ...updated,
      productTitle: offer.productTitle,
      orderId: null,
    };
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
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.userId === buyerId) {
      return res.status(400).json({ message: "You cannot make an offer on your own product" });
    }

    let conversationId = reqConvId;

    // Find or create conversation if not provided
    if (!conversationId) {
      const existingParts = await db.select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(or(
          eq(conversationParticipants.userId, buyerId),
          eq(conversationParticipants.userId, product.userId)
        ));

      const convCounts = {};
      existingParts.forEach(p => {
        convCounts[p.conversationId] = (convCounts[p.conversationId] || 0) + 1;
      });

      for (const [cid, count] of Object.entries(convCounts)) {
        if (count >= 2) {
          const [conv] = await db.select().from(conversations).where(eq(conversations.id, cid)).limit(1);
          if (conv && conv.productId === productId) {
            conversationId = cid;
            break;
          }
        }
      }

      if (!conversationId) {
        const [conv] = await db.insert(conversations).values({
          productId,
        }).returning();

        conversationId = conv.id;

        await db.insert(conversationParticipants).values([
          { conversationId: conv.id, userId: buyerId },
          { conversationId: conv.id, userId: product.userId },
        ]);
      }
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours expiry

    const [newOffer] = await db.insert(offers).values({
      productId,
      buyerId,
      sellerId: product.userId,
      amount: Number(amount),
      status: "pending",
      conversationId,
      expiresAt,
    }).returning();

    // Insert offer message in the chat
    const [msg] = await db.insert(messages).values({
      conversationId,
      senderId: buyerId,
      content: `Sent an offer of $${amount}`,
      status: "sent",
      type: "offer",
      metadata: {
        offerId: newOffer.id,
        offerAmount: Number(amount),
        offerStatus: "pending",
      },
    }).returning();

    // Update conversation last message
    await db.update(conversations).set({
      lastMessageId: msg.id,
      updatedAt: new Date(),
    }).where(eq(conversations.id, conversationId));

    // Emit live message event through Socket.io to conversation room
    const io = req.app.get("io");
    if (io) {
      const formattedMsg = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        status: msg.status,
        type: msg.type,
        metadata: msg.metadata,
        sentAt: msg.createdAt,
      };
      io.to(conversationId).emit("new_message", formattedMsg);
    }

    // Trigger offer notification to seller
    try {
      const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, buyerId)).limit(1);
      const senderName = sender ? sender.name : "A user";
      await db.insert(notifications).values({
        userId: product.userId,
        type: "message",
        title: "New Offer Received 💸",
        body: `${senderName} made an offer of $${amount} on "${product.title}"`,
        linkedEntityId: conversationId,
        linkedRoute: "/chat",
        isRead: false,
      });
    } catch (notifError) {
      console.error("Failed to trigger offer notification:", notifError);
    }

    res.status(201).json({
      message: "Offer submitted successfully",
      offer: newOffer,
      conversationId,
    });
  } catch (error) {
    console.error("Error making offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getOffers = async (req, res) => {
  try {
    const userId = req.user.id;
    // Get all offers where the user is buyer or seller, join with products to get titles
    const rawOffers = await db.select({
      id: offers.id,
      productId: offers.productId,
      buyerId: offers.buyerId,
      sellerId: offers.sellerId,
      amount: offers.amount,
      status: offers.status,
      conversationId: offers.conversationId,
      expiresAt: offers.expiresAt,
      counterAmount: offers.counterAmount,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      productTitle: products.title,
    })
      .from(offers)
      .leftJoin(products, eq(offers.productId, products.id))
      .where(or(eq(offers.buyerId, userId), eq(offers.sellerId, userId)))
      .orderBy(desc(offers.createdAt));

    const result = [];
    for (const offer of rawOffers) {
      result.push(await checkAndExpireOffer(offer));
    }

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
      id: offers.id,
      productId: offers.productId,
      buyerId: offers.buyerId,
      sellerId: offers.sellerId,
      amount: offers.amount,
      status: offers.status,
      conversationId: offers.conversationId,
      expiresAt: offers.expiresAt,
      counterAmount: offers.counterAmount,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      productTitle: products.title,
    })
      .from(offers)
      .leftJoin(products, eq(offers.productId, products.id))
      .where(eq(offers.id, id))
      .limit(1);

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      return res.status(403).json({ message: "Not authorized to view this offer" });
    }

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
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status !== "pending" && offer.status !== "countered") {
      return res.status(400).json({ message: `Cannot accept offer with status ${offer.status}` });
    }

    if (offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
      return res.status(400).json({ message: "Offer has expired" });
    }

    // Check product status
    const [product] = await db.select().from(products).where(eq(products.id, offer.productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.status !== "active") {
      return res.status(400).json({ message: `Product is currently ${product.status}` });
    }

    // Auth check
    let isAllowed = false;
    if (offer.status === "pending") {
      isAllowed = (offer.sellerId === userId);
    } else if (offer.status === "countered") {
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
          isAllowed = (offer.buyerId === userId);
        } else {
          isAllowed = (offer.sellerId === userId);
        }
      } else {
        isAllowed = (offer.buyerId === userId);
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ message: "You are not authorized to accept this offer" });
    }

    const checkoutExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours to checkout
    const [updatedOffer] = await db.update(offers)
      .set({ status: "accepted", expiresAt: checkoutExpiry, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();

    // Update product status to reserved
    await db.update(products)
      .set({ status: "reserved", updatedAt: new Date() })
      .where(eq(products.id, offer.productId));

    const recipientId = userId === offer.sellerId ? offer.buyerId : offer.sellerId;
    const finalAmount = offer.status === "countered" ? offer.counterAmount : offer.amount;

    // Send a system message in the chat
    const [msg] = await db.insert(messages).values({
      conversationId: offer.conversationId,
      senderId: userId,
      content: `✅ Offer accepted for $${finalAmount}!`,
      status: "sent",
      type: "system",
      metadata: {
        offerId: offer.id,
        offerAmount: Number(finalAmount),
        offerStatus: "accepted",
        expiresAt: checkoutExpiry,
      },
    }).returning();

    // Update conversation
    await db.update(conversations).set({
      lastMessageId: msg.id,
      updatedAt: new Date(),
    }).where(eq(conversations.id, offer.conversationId));

    // Emit live message event through Socket.io
    const io = req.app.get("io");
    if (io) {
      const formattedMsg = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        status: msg.status,
        type: msg.type,
        metadata: msg.metadata,
        sentAt: msg.createdAt,
      };
      io.to(offer.conversationId).emit("new_message", formattedMsg);
      io.to(offer.conversationId).emit("offer_status_changed", updatedOffer);
      io.to(offer.conversationId).emit("offer_accepted_checkout", {
        offerId: offer.id,
        productId: offer.productId,
        finalAmount: Number(finalAmount),
      });
    }

    try {
      const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      const senderName = sender ? sender.name : "A user";
      await db.insert(notifications).values({
        userId: recipientId,
        type: "message",
        title: "Offer Accepted! 🎉",
        body: `${senderName} accepted the offer of $${finalAmount}. You have 2 hours to checkout before it expires!`,
        linkedEntityId: offer.conversationId,
        linkedRoute: "/chat",
        isRead: false,
      });
    } catch (notifErr) {
      console.error("Error creating acceptOffer notification:", notifErr);
    }

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
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status !== "pending" && offer.status !== "countered") {
      return res.status(400).json({ message: `Cannot reject offer with status ${offer.status}` });
    }

    // Auth check
    let isAllowed = false;
    if (offer.status === "pending") {
      isAllowed = (offer.sellerId === userId);
    } else if (offer.status === "countered") {
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
          isAllowed = (offer.buyerId === userId);
        } else {
          isAllowed = (offer.sellerId === userId);
        }
      } else {
        isAllowed = (offer.buyerId === userId);
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ message: "You are not authorized to reject this offer" });
    }

    const [updatedOffer] = await db.update(offers)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();

    const recipientId = userId === offer.sellerId ? offer.buyerId : offer.sellerId;

    // Send a system message in the chat
    const [msg] = await db.insert(messages).values({
      conversationId: offer.conversationId,
      senderId: userId,
      content: `❌ Offer declined.`,
      status: "sent",
      type: "system",
      metadata: {
        offerId: offer.id,
        offerStatus: "rejected",
      },
    }).returning();

    // Update conversation
    await db.update(conversations).set({
      lastMessageId: msg.id,
      updatedAt: new Date(),
    }).where(eq(conversations.id, offer.conversationId));

    // Emit live message event through Socket.io
    const io = req.app.get("io");
    if (io) {
      const formattedMsg = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        status: msg.status,
        type: msg.type,
        metadata: msg.metadata,
        sentAt: msg.createdAt,
      };
      io.to(offer.conversationId).emit("new_message", formattedMsg);
      io.to(offer.conversationId).emit("offer_status_changed", updatedOffer);
    }

    try {
      const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      const senderName = sender ? sender.name : "A user";
      await db.insert(notifications).values({
        userId: recipientId,
        type: "message",
        title: "Offer Declined ❌",
        body: `${senderName} declined the offer`,
        linkedEntityId: offer.conversationId,
        linkedRoute: "/chat",
        isRead: false,
      });
    } catch (notifErr) {
      console.error("Error creating rejectOffer notification:", notifErr);
    }

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

    if (!counterAmount) {
      return res.status(400).json({ message: "Counter amount is required" });
    }

    const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status !== "pending" && offer.status !== "countered") {
      return res.status(400).json({ message: `Cannot counter offer with status ${offer.status}` });
    }

    let isAllowed = false;
    if (offer.status === "pending") {
      isAllowed = (offer.sellerId === userId);
    } else if (offer.status === "countered") {
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
          isAllowed = (offer.buyerId === userId);
        } else {
          isAllowed = (offer.sellerId === userId);
        }
      } else {
        isAllowed = (offer.buyerId === userId);
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ message: "You are not authorized to counter this offer" });
    }

    if (offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
      return res.status(400).json({ message: "Offer has expired" });
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // Reset expiration window to 2 hours for the counter-offer

    const [updatedOffer] = await db.update(offers)
      .set({
        status: "countered",
        counterAmount: Number(counterAmount),
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, id))
      .returning();

    // Send counter_offer message in the chat
    const [msg] = await db.insert(messages).values({
      conversationId: offer.conversationId,
      senderId: userId,
      content: `Proposed counter-offer of $${counterAmount}`,
      status: "sent",
      type: "counter_offer",
      metadata: {
        offerId: offer.id,
        offerAmount: Number(offer.amount),
        counterAmount: Number(counterAmount),
        offerStatus: "countered",
      },
    }).returning();

    // Update conversation
    await db.update(conversations).set({
      lastMessageId: msg.id,
      updatedAt: new Date(),
    }).where(eq(conversations.id, offer.conversationId));

    // Emit live message event through Socket.io
    const io = req.app.get("io");
    if (io) {
      const formattedMsg = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        status: msg.status,
        type: msg.type,
        metadata: msg.metadata,
        sentAt: msg.createdAt,
      };
      io.to(offer.conversationId).emit("new_message", formattedMsg);
      io.to(offer.conversationId).emit("offer_status_changed", updatedOffer);
    }

    try {
      const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      const senderName = sender ? sender.name : "The seller";
      await db.insert(notifications).values({
        userId: offer.buyerId,
        type: "message",
        title: "Counter-offer Proposed 💸",
        body: `${senderName} proposed a counter-offer of $${counterAmount}`,
        linkedEntityId: offer.conversationId,
        linkedRoute: "/chat",
        isRead: false,
      });
    } catch (notifErr) {
      console.error("Error creating counterOffer notification:", notifErr);
    }

    res.json(updatedOffer);
  } catch (error) {
    console.error("Error countering offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  makeOffer,
  getOffers,
  getOffer,
  acceptOffer,
  rejectOffer,
  counterOffer,
  checkAndExpireOffer,
};
