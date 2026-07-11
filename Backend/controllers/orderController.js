const db = require("../db");
const { orders, products, users, coupons, offers, settings } = require("../db/schema");
const { createNotification } = require("../utils/notifications");
const { eq, or, and, desc, sql, lt } = require("drizzle-orm");
const { alias } = require("drizzle-orm/pg-core");
const { updateUserStats } = require("../utils/userStats");
const { loadActivePromotions, calculateCheckoutPrice, loadPlatformFeePercent, calculatePlatformFee, loadSellerEffectiveFeePercent } = require("../utils/discountEngine");

const buyer = alias(users, "buyer");
const seller = alias(users, "seller");

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
    originalPrice: o.originalPrice,
    flashSaleDiscount: o.flashSaleDiscount,
    categorySaleDiscount: o.categorySaleDiscount,
    couponDiscount: o.couponDiscount,
    offerAmount: o.offerAmount,
    platformFee: o.platformFee,
    totalPrice: o.price,
    status: o.status,
    paymentMethod: o.paymentMethod,
    shippingAddress: o.shippingAddress,
    trackingNumber: o.trackingNumber,
    notes: o.notes,
    couponCode: o.couponCode,
    offerId: o.offerId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const createOrder = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { productId, paymentMethod, shippingAddress, notes, couponCode, offerId } = req.body;

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

    if (product.status === "reserved") {
      // Allow through if this user reserved it (direct checkout reservation)
      if (product.reservedBy === buyerId) {
        // proceed
      } else {
        // Check if this buyer has an accepted offer (offer-based reservation)
        const activeOffers = await db.select().from(offers)
          .where(and(
            eq(offers.productId, productId),
            eq(offers.status, "accepted"),
            eq(offers.buyerId, buyerId)
          ))
          .limit(1);

        if (activeOffers.length === 0) {
          return res.status(400).json({ message: "This item is currently reserved for another buyer." });
        }
      }
    }

    const sellerId = product.userId;
    if (buyerId === sellerId) {
      return res.status(400).json({ message: "You cannot purchase your own product" });
    }

    // Determine offer amount if an accepted offer exists
    let offerAmount = null;
    if (offerId) {
      const [acceptedOffer] = await db.select().from(offers)
        .where(and(
          eq(offers.id, offerId),
          eq(offers.status, "accepted"),
          eq(offers.buyerId, buyerId)
        ))
        .limit(1);
      if (acceptedOffer) {
        offerAmount = acceptedOffer.counterAmount || acceptedOffer.amount;
      }
    }

    // Calculate price server-side using the discount engine
    const promotions = await loadActivePromotions();
    const { finalPrice, breakdown, couponValid, couponMessage } = await calculateCheckoutPrice(
      product,
      promotions,
      { couponCode: couponCode || null, offerAmount, buyerId }
    );

    if (couponCode && !couponValid) {
      return res.status(400).json({ message: couponMessage || "Invalid coupon" });
    }

    // Calculate platform fee (tier-based for online payments, configurable for COD)
    let platformFeePercent;
    if (paymentMethod === "cash_on_delivery") {
      const [codFeeRow] = await db.select().from(settings).where(eq(settings.key, 'codFeePercent'));
      platformFeePercent = codFeeRow ? parseFloat(codFeeRow.value) : 0;
    } else {
      platformFeePercent = await loadSellerEffectiveFeePercent(sellerId);
    }
    const platformFee = calculatePlatformFee(finalPrice, platformFeePercent);

    const code = couponCode ? couponCode.trim().toUpperCase() : null;

    const order = await db.transaction(async (tx) => {
      // Lock the product row to prevent concurrent purchases
      const locked = await tx.execute(sql`SELECT id, status FROM products WHERE id = ${productId} FOR UPDATE`);
      const productRows = locked.rows || locked;
      if (productRows.length > 0 && productRows[0].status === 'sold') {
        const err = new Error("This product is already sold");
        err.statusCode = 400;
        throw err;
      }

      if (code) {
        await tx.execute(sql`SELECT 1 FROM coupons WHERE code = ${code} FOR UPDATE`);
      }

      const [o] = await tx.insert(orders).values({
        productId,
        buyerId,
        sellerId,
        price: finalPrice,
        originalPrice: breakdown.originalPrice,
        flashSaleDiscount: breakdown.flashSaleDiscount,
        categorySaleDiscount: breakdown.categorySaleDiscount,
        couponDiscount: breakdown.couponDiscount,
        offerAmount: breakdown.offerAmount,
        platformFee,
        paymentMethod,
        shippingAddress,
        notes: notes || null,
        couponCode: code,
        offerId: offerId || null,
      }).returning();

      await tx.update(products).set({
        status: "sold",
        updatedAt: new Date(),
      }).where(eq(products.id, productId));

      if (code) {
        await tx.update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
          .where(eq(coupons.code, code));
      }

      if (offerId) {
        await tx.update(offers)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(offers.id, offerId));
      }

      return o;
    });

    await updateUserStats(buyerId);
    await updateUserStats(sellerId);

    const [buyerUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, buyerId)).limit(1);
    const buyerName = buyerUser ? buyerUser.name : "A buyer";

    await createNotification({
      userId: sellerId, type: "order_update", title: "New Order Placed",
      body: `${buyerName} placed an order for "${product.title}".`,
      linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: order.id,
    });

    const populated = await db.select()
      .from(orders)
      .where(eq(orders.id, order.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(buyer, eq(orders.buyerId, buyer.id))
      .leftJoin(seller, eq(orders.sellerId, seller.id))
      .limit(1);

    res.status(201).json(formatOrder(populated[0], buyerId));
  } catch (error) {
    console.error("Error creating order:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Server Error" });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ value: sql`COUNT(*)` })
      .from(orders)
      .where(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId)));

    const total = Number(totalResult.value);

    const result = await db.select()
      .from(orders)
      .where(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId)))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(buyer, eq(orders.buyerId, buyer.id))
      .leftJoin(seller, eq(orders.sellerId, seller.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      orders: result.map(o => formatOrder(o, userId)),
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    });
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
      .leftJoin(buyer, eq(orders.buyerId, buyer.id))
      .leftJoin(seller, eq(orders.sellerId, seller.id))
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

    if (status === "shipped") {
      await createNotification({
        userId: order.buyerId, type: "order_update", title: "Order Shipped",
        body: `Your order for "${productTitle}" has been shipped!`,
        linkedRoute: "/profile/me?tab=orders&view=purchases", linkedEntityId: order.id,
      });
    } else if (status === "delivered") {
      // Credit seller's balance for online payments when order is delivered (net of platform fee)
      if (order.status !== "delivered" && order.paymentMethod === "online") {
        const netEarnings = Math.max(0, (order.price || 0) - (order.platformFee || 0));
        await db.update(users)
          .set({ balance: sql`${users.balance} + ${netEarnings}`, updatedAt: new Date() })
          .where(eq(users.id, order.sellerId));
      }

      await createNotification({
        userId: order.sellerId, type: "order_update", title: "Order Delivered",
        body: `Your sale of "${productTitle}" has been delivered and confirmed by the buyer!`,
        linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: order.id,
      });
    } else if (status === "cancelled") {
      const recipientId = isBuyer ? order.sellerId : order.buyerId;
      const initiator = isBuyer ? "Buyer" : "Seller";
      await createNotification({
        userId: recipientId, type: "order_update", title: "Order Cancelled",
        body: `${initiator} cancelled the order for "${productTitle}".`,
        linkedRoute: isBuyer ? "/profile/me?tab=orders&view=sales" : "/profile/me?tab=orders&view=purchases",
        linkedEntityId: order.id,
      });
    }

    const populated = await db.select()
      .from(orders)
      .where(eq(orders.id, order.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(buyer, eq(orders.buyerId, buyer.id))
      .leftJoin(seller, eq(orders.sellerId, seller.id))
      .limit(1);

    res.json(formatOrder(populated[0], userId));
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, productId } = req.body;
    if (!code || !productId) {
      return res.status(400).json({ message: "Coupon code and product ID are required" });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon code not found" });
    }

    // Use the discount engine to validate the coupon and compute pricing
    const promotions = await loadActivePromotions();
    const result = await calculateCheckoutPrice(product, promotions, { couponCode: code, buyerId: req.user.id });

    if (!result.couponValid) {
      return res.status(400).json({ message: result.couponMessage || "Invalid coupon code" });
    }

    res.json({
      valid: true,
      discountAmount: result.breakdown.couponDiscount,
      finalPrice: result.finalPrice,
      originalPrice: result.breakdown.originalPrice,
      salePrice: result.breakdown.originalPrice - result.breakdown.flashSaleDiscount - result.breakdown.categorySaleDiscount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      breakdown: result.breakdown,
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getRandomActiveCoupon = async (req, res) => {
  try {
    // Use a transaction with FOR UPDATE to atomically reserve a coupon
    const order = await db.transaction(async (tx) => {
      const allCoupons = await tx.execute(sql`SELECT * FROM coupons WHERE is_active = true FOR UPDATE`);
      const rows = allCoupons.rows || allCoupons;

      // Filter out expired and maxed-out coupons
      const validCoupons = rows.filter(coupon => {
        if (coupon.expiryDate && new Date(coupon.expiryDate) <= new Date()) return false;
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return false;
        return true;
      });

      if (validCoupons.length === 0) {
        return null;
      }

      // Pick one at random
      const randomIndex = Math.floor(Math.random() * validCoupons.length);
      const chosenCoupon = validCoupons[randomIndex];

      // Atomically increment usedCount to reserve it
      await tx.execute(sql`UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = ${chosenCoupon.id}`);

      return chosenCoupon;
    });

    if (!order) {
      return res.status(404).json({ message: "No active coupons available at the moment. Try again later!" });
    }

    res.json({
      code: order.code,
      discountType: order.discountType,
      discountValue: order.discountValue,
      expiryDate: order.expiryDate
    });
  } catch (error) {
    console.error("Error fetching random coupon:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const autoConfirmDelivery = async () => {
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const staleOrders = await db.select().from(orders)
      .where(and(
        eq(orders.status, "shipped"),
        lt(orders.updatedAt, cutoff)
      ));

    let confirmed = 0;
    for (const order of staleOrders) {
      await db.update(orders)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      if (order.paymentMethod === "online") {
        const netEarnings = Math.max(0, (order.price || 0) - (order.platformFee || 0));
        await db.update(users)
          .set({ balance: sql`${users.balance} + ${netEarnings}`, updatedAt: new Date() })
          .where(eq(users.id, order.sellerId));
      }

      await updateUserStats(order.buyerId);
      await updateUserStats(order.sellerId);
      confirmed++;
    }

    return { confirmed };
  } catch (error) {
    console.error("[AutoConfirmDelivery] Error:", error.message);
    return { confirmed: 0 };
  }
};

const disputeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.sellerId !== userId) {
      return res.status(403).json({ message: "Only the seller can dispute an order" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Can only dispute delivered orders" });
    }

    await db.update(orders)
      .set({ status: "disputed", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await createNotification({
      userId: order.buyerId, type: "system", title: "Order Disputed",
      body: `The seller has disputed the delivery for order #${order.id.slice(0, 8)}. Admin will review.`,
      linkedRoute: "/profile/me?tab=orders&view=purchases", linkedEntityId: order.id,
    });

    res.json({ message: "Order disputed. Admin will review the case." });
  } catch (error) {
    console.error("Error disputing order:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Auto-deduct disputed seller balance if admin sides with buyer
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!["seller_fault", "buyer_fault"].includes(resolution)) {
      return res.status(400).json({ message: "Resolution must be 'seller_fault' or 'buyer_fault'" });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "disputed") {
      return res.status(400).json({ message: "Order is not disputed" });
    }

    if (resolution === "seller_fault") {
      const sellerNet = Math.max(0, (order.price || 0) - (order.platformFee || 0));
      const [seller] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, order.sellerId)).limit(1);
      if (!seller || seller.balance < sellerNet) {
        return res.status(400).json({ message: `Seller has insufficient balance ($${(seller?.balance || 0).toFixed(2)}) to refund $${sellerNet.toFixed(2)}` });
      }
      await db.update(users)
        .set({ balance: sql`${users.balance} - ${sellerNet}`, updatedAt: new Date() })
        .where(eq(users.id, order.sellerId));
      await db.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, order.id));
      await db.update(products).set({ status: "active", updatedAt: new Date() }).where(eq(products.id, order.productId));

      await createNotification({
        userId: order.buyerId, type: "system", title: "Dispute Resolved — Your Favor",
        body: `The dispute for order #${order.id.slice(0, 8)} has been resolved in your favor. The amount has been refunded.`,
        linkedRoute: "/profile/me?tab=orders&view=purchases", linkedEntityId: order.id,
      });
      await createNotification({
        userId: order.sellerId, type: "system", title: "Dispute Resolved — Seller Fault",
        body: `The dispute for order #${order.id.slice(0, 8)} was ruled against you. The amount was deducted from your balance.`,
        linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: order.id,
      });
    } else {
      await db.update(orders).set({ status: "delivered", updatedAt: new Date() }).where(eq(orders.id, order.id));

      await createNotification({
        userId: order.buyerId, type: "system", title: "Dispute Resolved — Seller Side",
        body: `The dispute for order #${order.id.slice(0, 8)} has been resolved in the seller's favor. Delivery confirmed.`,
        linkedRoute: "/profile/me?tab=orders&view=purchases", linkedEntityId: order.id,
      });
      await createNotification({
        userId: order.sellerId, type: "system", title: "Dispute Resolved — Your Favor",
        body: `The dispute for order #${order.id.slice(0, 8)} has been resolved in your favor.`,
        linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: order.id,
      });
    }

    await updateUserStats(order.buyerId);
    await updateUserStats(order.sellerId);

    res.json({ message: `Dispute resolved: ${resolution}` });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrder,
  validateCoupon,
  getRandomActiveCoupon,
  autoConfirmDelivery,
  disputeOrder,
  resolveDispute,
};
