const db = require("../db");
const { orders, products, users, coupons, offers } = require("../db/schema");
const { eq, and, sql } = require("drizzle-orm");
const { loadActivePromotions, calculateCheckoutPrice, loadPlatformFeePercent, calculatePlatformFee } = require("../utils/discountEngine");
const { createNotification } = require("../utils/notifications");
const { updateUserStats } = require("../utils/userStats");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const DOMAIN = process.env.DOMAIN || "http://localhost:4200";

/**
 * Creates a Stripe Checkout Session and returns the URL.
 * Buyer is redirected to Stripe to complete payment.
 */
const createCheckoutSession = async (req, res) => {
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
      { couponCode: couponCode || null, offerAmount }
    );

    if (couponCode && !couponValid) {
      return res.status(400).json({ message: couponMessage || "Invalid coupon" });
    }

    // Calculate platform fee
    const platformFeePercent = await loadPlatformFeePercent();
    const platformFee = calculatePlatformFee(finalPrice, platformFeePercent);
    const totalAmount = finalPrice + platformFee;

    // Round to cents for Stripe
    const totalCents = Math.round(totalAmount * 100);

    // Store order data in metadata to create order after payment
    const metadata = {
      productId,
      buyerId,
      sellerId: product.userId,
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              images: product.images?.length ? [product.images[0]] : [],
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${DOMAIN}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/?payment=cancel`,
      metadata,
      customer_email: req.user.email,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Stripe webhook handler.
 * Listens for checkout.session.completed to create the order.
 */
const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const meta = session.metadata;

    if (!meta || !meta.productId) {
      console.error("Missing metadata in session:", session.id);
      return res.status(400).json({ message: "Missing metadata" });
    }

    try {
      // Check if order already exists (idempotency)
      const existingOrders = await db.select({ id: orders.id }).from(orders)
        .where(and(
          eq(orders.productId, meta.productId),
          eq(orders.buyerId, meta.buyerId),
          eq(orders.paymentMethod, "online"),
        )).limit(1);

      if (existingOrders.length > 0) {
        return res.json({ received: true, message: "Order already exists" });
      }

      const [order] = await db.insert(orders).values({
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
        couponCode: meta.couponCode || null,
        offerId: meta.offerId || null,
      }).returning();

      // Mark product as sold
      await db.update(products).set({ status: "sold", updatedAt: new Date() })
        .where(eq(products.id, meta.productId));

      // Increment coupon usage
      if (meta.couponCode) {
        await db.update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
          .where(eq(coupons.code, meta.couponCode));
      }

      await updateUserStats(meta.buyerId);
      await updateUserStats(meta.sellerId);

      // Notify seller
      const [buyerUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, meta.buyerId)).limit(1);
      const [productInfo] = await db.select({ title: products.title }).from(products).where(eq(products.id, meta.productId)).limit(1);

      await createNotification({
        userId: meta.sellerId, type: "order_update", title: "New Order Placed (Paid)",
        body: `${buyerUser?.name || "A buyer"} paid for "${productInfo?.title || "item"}" online.`,
        linkedRoute: "/profile/me?tab=orders&view=sales", linkedEntityId: order.id,
      });

      console.log(`Order ${order.id} created from Stripe session ${session.id}`);
    } catch (error) {
      console.error("Error creating order from webhook:", error);
      return res.status(500).json({ message: "Server Error" });
    }
  }

  res.json({ received: true });
};

/**
 * Get payment status for a session (for success page).
 */
const getSessionStatus = async (req, res) => {
  try {
    const { session_id } = req.params;
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({
      status: session.payment_status,
      amount_total: session.amount_total,
      customer_email: session.customer_email,
    });
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createCheckoutSession,
  stripeWebhook,
  getSessionStatus,
};
