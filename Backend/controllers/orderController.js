const db = require("../db");
const { orders, products, users, notifications } = require("../db/schema");
const { eq, or, and, desc } = require("drizzle-orm");
const { updateUserStats } = require("../utils/userStats");

const formatOrder = (row, currentUserId) => {
  const o = row.orders;
  const product = row.products;
  const buyer = row.buyer;
  const seller = row.seller;

  const mapUser = (u) => {
    if (!u) return null;
    const nameParts = (u.name || '').trim().split(/\s+/);
    return {
      id: u.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.email}`,
      isVerified: u.isVerified || false,
      rating: u.rating || 5.0,
    };
  };

  const productData = product ? {
    id: product.id,
    title: product.title,
    price: product.price,
    thumbnail: (product.images || [])[0] || '',
    brand: (product.dynamicAttributes?.brand) || '',
    condition: (product.dynamicAttributes?.condition) || '',
    status: product.status,
    sellerId: product.userId,
  } : null;

  return {
    id: o.id,
    product: productData,
    buyer: mapUser(buyer),
    seller: mapUser(seller),
    price: o.price,
    status: o.status,
    paymentMethod: o.paymentMethod,
    shippingAddress: o.shippingAddress,
    notes: o.notes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const createOrder = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { productId, paymentMethod, shippingAddress, notes } = req.body;

    if (!productId || !paymentMethod || !shippingAddress) {
      return res.status(400).json({ message: "Please provide product, payment method, and shipping address" });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status === "sold") {
      return res.status(400).json({ message: "This product is already sold" });
    }

    const sellerId = product.userId;
    if (buyerId === sellerId) {
      return res.status(400).json({ message: "You cannot purchase your own product" });
    }

    const [order] = await db.insert(orders).values({
      productId,
      buyerId,
      sellerId,
      price: product.price,
      paymentMethod,
      shippingAddress,
      notes: notes || null,
    }).returning();

    await db.update(products).set({
      status: "sold",
      updatedAt: new Date(),
    }).where(eq(products.id, productId));

    await updateUserStats(buyerId);
    await updateUserStats(sellerId);

    const [buyerUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, buyerId)).limit(1);
    const buyerName = buyerUser ? buyerUser.name : "A buyer";

    await db.insert(notifications).values({
      userId: sellerId,
      type: "order_update",
      title: "New Order Placed",
      body: `${buyerName} placed an order for "${product.title}".`,
      linkedEntityId: order.id,
      linkedRoute: "/profile/me?tab=orders&view=sales",
    });

    const populated = await db.select()
      .from(orders)
      .where(eq(orders.id, order.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users.as("buyer"), eq(orders.buyerId, users.as("buyer").id))
      .leftJoin(users.as("seller"), eq(orders.sellerId, users.as("seller").id))
      .limit(1);

    res.status(201).json(formatOrder(populated[0], buyerId));
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.select()
      .from(orders)
      .where(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId)))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users.as("buyer"), eq(orders.buyerId, users.as("buyer").id))
      .leftJoin(users.as("seller"), eq(orders.sellerId, users.as("seller").id))
      .orderBy(desc(orders.createdAt));

    res.json(result.map(o => formatOrder(o, userId)));
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.select()
      .from(orders)
      .where(eq(orders.id, req.params.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users.as("buyer"), eq(orders.buyerId, users.as("buyer").id))
      .leftJoin(users.as("seller"), eq(orders.sellerId, users.as("seller").id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const row = result[0];
    if (row.orders.buyerId !== userId && row.orders.sellerId !== userId) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    res.json(formatOrder(row, userId));
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, trackingNumber } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Please provide order status" });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isBuyer = order.buyerId === userId;
    const isSeller = order.sellerId === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    if (status === "shipped" && !isSeller) {
      return res.status(403).json({ message: "Only the seller can mark an order as shipped" });
    }
    if (status === "delivered" && !isBuyer) {
      return res.status(403).json({ message: "Only the buyer can confirm delivery" });
    }

    if (status === "cancelled") {
      await db.update(products).set({ status: "active", updatedAt: new Date() })
        .where(eq(products.id, order.productId));
    }

    const updateData = { status, updatedAt: new Date() };
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber;
    }

    await db.update(orders).set(updateData).where(eq(orders.id, order.id));

    await updateUserStats(order.buyerId);
    await updateUserStats(order.sellerId);

    const [product] = await db.select({ title: products.title }).from(products)
      .where(eq(products.id, order.productId)).limit(1);
    const productTitle = product ? product.title : "item";

    try {
      if (status === "shipped") {
        await db.insert(notifications).values({
          userId: order.buyerId,
          type: "order_update",
          title: "Order Shipped",
          body: `Your order for "${productTitle}" has been shipped!`,
          linkedEntityId: order.id,
          linkedRoute: "/profile/me?tab=orders&view=purchases",
        });
      } else if (status === "delivered") {
        await db.insert(notifications).values({
          userId: order.sellerId,
          type: "order_update",
          title: "Order Delivered",
          body: `Your sale of "${productTitle}" has been delivered and confirmed by the buyer!`,
          linkedEntityId: order.id,
          linkedRoute: "/profile/me?tab=orders&view=sales",
        });
      } else if (status === "cancelled") {
        const recipientId = isBuyer ? order.sellerId : order.buyerId;
        const initiator = isBuyer ? "Buyer" : "Seller";
        await db.insert(notifications).values({
          userId: recipientId,
          type: "order_update",
          title: "Order Cancelled",
          body: `${initiator} cancelled the order for "${productTitle}".`,
          linkedEntityId: order.id,
          linkedRoute: isBuyer ? "/profile/me?tab=orders&view=sales" : "/profile/me?tab=orders&view=purchases",
        });
      }
    } catch (notifErr) {
      console.error("Error triggering order notification:", notifErr);
    }

    const populated = await db.select()
      .from(orders)
      .where(eq(orders.id, order.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users.as("buyer"), eq(orders.buyerId, users.as("buyer").id))
      .leftJoin(users.as("seller"), eq(orders.sellerId, users.as("seller").id))
      .limit(1);

    res.json(formatOrder(populated[0], userId));
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrder,
};
