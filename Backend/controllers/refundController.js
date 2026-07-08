const db = require("../db");
const { refundRequests, orders, products, users } = require("../db/schema");
const { eq, and, desc, or, sql } = require("drizzle-orm");
const { createNotification } = require("../utils/notifications");
const { updateUserStats } = require("../utils/userStats");

const requestRefund = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { orderId, reason, details } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ message: "Order ID and reason are required" });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.buyerId !== buyerId) {
      return res.status(403).json({ message: "Only the buyer can request a refund" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Can only request refund for delivered orders" });
    }
    if (order.paymentMethod !== "online") {
      return res.status(400).json({ message: "Refunds are only available for online payments" });
    }

    const [existing] = await db.select().from(refundRequests)
      .where(and(eq(refundRequests.orderId, orderId), eq(refundRequests.status, "pending")))
      .limit(1);
    if (existing) {
      return res.status(400).json({ message: "A refund request is already pending for this order" });
    }

    const [refund] = await db.insert(refundRequests).values({
      orderId, buyerId, sellerId: order.sellerId, reason, details: details || null,
    }).returning();

    await createNotification({
      userId: order.sellerId, type: "system", title: "Refund Requested",
      body: `A buyer has requested a refund for order #${orderId.slice(0, 8)}.`,
      linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: orderId,
    });

    res.status(201).json(refund);
  } catch (error) {
    console.error("Error requesting refund:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMyRefundRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const myRefunds = await db.select()
      .from(refundRequests)
      .where(or(eq(refundRequests.buyerId, userId), eq(refundRequests.sellerId, userId)))
      .leftJoin(orders, eq(refundRequests.orderId, orders.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .orderBy(desc(refundRequests.createdAt));

    const formatted = myRefunds.map(r => ({
      ...r.refund_requests,
      order: r.orders ? { id: r.orders.id, price: r.orders.price, status: r.orders.status, paymentMethod: r.orders.paymentMethod } : null,
      product: r.products ? { id: r.products.id, title: r.products.title, thumbnail: (r.products.images || [])[0] } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching refund requests:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const adminGetRefundRequests = async (req, res) => {
  try {
    const list = await db.select()
      .from(refundRequests)
      .leftJoin(orders, eq(refundRequests.orderId, orders.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users, eq(refundRequests.buyerId, users.id))
      .orderBy(desc(refundRequests.createdAt));

    const formatted = list.map(r => ({
      ...r.refund_requests,
      order: r.orders ? { id: r.orders.id, price: r.orders.price, status: r.orders.status, paymentMethod: r.orders.paymentMethod, platformFee: r.orders.platformFee } : null,
      product: r.products ? { id: r.products.id, title: r.products.title, thumbnail: (r.products.images || [])[0] } : null,
      buyer: r.users ? { id: r.users.id, name: r.users.name, email: r.users.email } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching all refund requests:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const adminProcessRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    const [refund] = await db.select().from(refundRequests).where(eq(refundRequests.id, id)).limit(1);
    if (!refund) {
      return res.status(404).json({ message: "Refund request not found" });
    }
    if (refund.status !== "pending") {
      return res.status(400).json({ message: "This refund request has already been processed" });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, refund.orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Associated order not found" });
    }

    await db.update(refundRequests).set({ status, resolution: resolution || null, updatedAt: new Date() })
      .where(eq(refundRequests.id, id));

    if (status === "approved") {
      const sellerNet = Math.max(0, (order.price || 0) - (order.platformFee || 0));
      await db.update(users).set({
        balance: sql`${users.balance} - ${sellerNet}`,
        updatedAt: new Date(),
      }).where(eq(users.id, order.sellerId));

      await db.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, order.id));

      await db.update(products).set({ status: "active", updatedAt: new Date() }).where(eq(products.id, order.productId));

      await createNotification({
        userId: refund.buyerId, type: "system", title: "Refund Approved",
        body: `Your refund request for order #${order.id.slice(0, 8)} has been approved. The funds have been returned.`,
        linkedRoute: "/profile/me?tab=orders&view=purchases", linkedEntityId: order.id,
      });
      await createNotification({
        userId: refund.sellerId, type: "system", title: "Refund Processed",
        body: `A refund for order #${order.id.slice(0, 8)} has been approved. The amount was deducted from your balance.`,
        linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: order.id,
      });
    } else {
      await createNotification({
        userId: refund.buyerId, type: "system", title: "Refund Rejected",
        body: `Your refund request for order #${order.id.slice(0, 8)} was rejected. Reason: ${resolution || "Not specified"}`,
        linkedRoute: "/profile/me?tab=orders&view=purchases", linkedEntityId: order.id,
      });
    }

    await updateUserStats(order.buyerId);
    await updateUserStats(order.sellerId);

    res.json({ message: `Refund request ${status} successfully` });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { requestRefund, getMyRefundRequests, adminGetRefundRequests, adminProcessRefund };