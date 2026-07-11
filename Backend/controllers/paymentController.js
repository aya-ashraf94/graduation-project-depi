const db = require("../db");
const { orders, products, users, coupons, offers } = require("../db/schema");
const { eq, and, sql } = require("drizzle-orm");
const { loadActivePromotions, calculateCheckoutPrice, loadPlatformFeePercent, calculatePlatformFee, loadSellerEffectiveFeePercent } = require("../utils/discountEngine");
const { createNotification } = require("../utils/notifications");
const { updateUserStats } = require("../utils/userStats");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Shared logic to create an order from PaymentIntent metadata.
 * Used by the webhook. Idempotent — safe to call multiple times.
 */
const createOrderFromMetadata = async (meta, paymentIntentId) => {
  const code = meta.couponCode ? meta.couponCode.trim().toUpperCase() : null;

  const order = await db.transaction(async (tx) => {
    // Idempotency check INSIDE the transaction with FOR UPDATE to prevent race conditions
    if (paymentIntentId) {
      const existing = await tx.execute(sql`SELECT id FROM orders WHERE stripe_payment_intent_id = ${paymentIntentId} LIMIT 1 FOR UPDATE`);
      const existingRows = existing.rows || existing;
      if (existingRows.length > 0) {
        const [found] = await tx.select().from(orders).where(eq(orders.id, existingRows[0].id)).limit(1);
        return found;
      }
    }

    if (code) {
      await tx.execute(sql`SELECT 1 FROM coupons WHERE code = ${code} FOR UPDATE`);
    }

    const [o] = await tx.insert(orders).values({
      productId: meta.productId,
      buyerId: meta.buyerId,
      sellerId: meta.sellerId,
      price: parseFloat(meta.finalPrice),
      originalPrice: parseFloat(meta.originalPrice),
      flashSaleDiscount: parseFloat(meta.flashSaleDiscount),
      categorySaleDiscount: parseFloat(meta.categorySaleDiscount),
      couponDiscount: parseFloat(meta.couponDiscount),
      offerAmount: meta.offerAmount ? parseFloat(meta.offerAmount) : null,
      platformFee: parseFloat(meta.platformFee),
      paymentMethod: "online",
      shippingAddress: meta.shippingAddress,
      notes: meta.notes || null,
      couponCode: code,
      offerId: meta.offerId || null,
      stripePaymentIntentId: paymentIntentId || null,
    }).returning();

    await tx.update(products).set({ status: "sold", updatedAt: new Date() })
      .where(eq(products.id, meta.productId));

    if (code) {
      await tx.update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
        .where(eq(coupons.code, code));
    }

    if (meta.offerId) {
      await tx.update(offers)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(offers.id, meta.offerId));
    }

    return o;
  });

  await updateUserStats(meta.buyerId);
  await updateUserStats(meta.sellerId);

  const [buyerUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, meta.buyerId)).limit(1);
  const [productInfo] = await db.select({ title: products.title }).from(products).where(eq(products.id, meta.productId)).limit(1);

  await createNotification({
    userId: meta.sellerId, type: "order_update", title: "New Order Placed (Paid)",
    body: `${buyerUser?.name || "A buyer"} paid for "${productInfo?.title || "item"}" online.`,
    linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: order.id,
  });

  return order;
};

/**
 * Creates a Stripe PaymentIntent for inline card payment.
 * Returns client_secret so the frontend can confirm payment without redirect.
 */
const createPaymentIntent = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { productId, shippingAddress, notes, couponCode, offerId } = req.body;

    if (!productId || !shippingAddress) {
      return res.status(400).json({ message: "Product and shipping address are required" });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status === "sold") {
      return res.status(400).json({ message: "This product is already sold" });
    }

    if (product.userId === buyerId) {
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

    // Calculate price server-side
    const promotions = await loadActivePromotions();
    const { finalPrice, breakdown, couponValid, couponMessage } = await calculateCheckoutPrice(
      product,
      promotions,
      { couponCode: couponCode || null, offerAmount, buyerId }
    );

    if (couponCode && !couponValid) {
      return res.status(400).json({ message: couponMessage || "Invalid coupon" });
    }

    // Calculate platform fee (tier-based)
    const platformFeePercent = await loadSellerEffectiveFeePercent(product.userId);
    const platformFee = calculatePlatformFee(finalPrice, platformFeePercent);
    const totalAmount = finalPrice; // Seller pays the fee, buyer only pays finalPrice

    const totalCents = Math.round(totalAmount * 100);

    const metadata = {
      productId,
      buyerId: String(buyerId),
      sellerId: String(product.userId),
      finalPrice: finalPrice.toString(),
      originalPrice: breakdown.originalPrice.toString(),
      flashSaleDiscount: breakdown.flashSaleDiscount.toString(),
      categorySaleDiscount: breakdown.categorySaleDiscount.toString(),
      couponDiscount: breakdown.couponDiscount.toString(),
      offerAmount: (breakdown.offerAmount || "").toString(),
      platformFee: platformFee.toString(),
      paymentMethod: "online",
      shippingAddress,
      notes: notes || "",
      couponCode: couponCode ? couponCode.trim().toUpperCase() : "",
      offerId: offerId || "",
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Called by the frontend after stripe.confirmCardPayment succeeds.
 * Verifies the PaymentIntent with Stripe and creates the order immediately.
 */
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: "Payment intent ID is required" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment has not been completed" });
    }

    const meta = paymentIntent.metadata;

    if (!meta || !meta.productId) {
      return res.status(400).json({ message: "Missing payment metadata" });
    }

    const order = await createOrderFromMetadata(meta, paymentIntentId);
    console.log(`Order ${order.id} created from PaymentIntent ${paymentIntentId}`);
    res.json({ order });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const meta = paymentIntent.metadata;

    if (!meta || !meta.productId) {
      console.error("Webhook: PaymentIntent missing metadata — cannot create order", paymentIntent.id);
      return res.status(200).json({ received: true }); // acknowledge Stripe but skip
    }

    try {
      const order = await createOrderFromMetadata(meta, paymentIntent.id);
      console.log(`Webhook: Order ${order.id} created/reused from PaymentIntent ${paymentIntent.id}`);
    } catch (err) {
      console.error("Webhook: Failed to create order from PaymentIntent:", err.message);
      return res.status(500).send("Server Error");
    }
  }

  res.json({ received: true });
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createOrderFromMetadata,
  handleWebhook,
};
