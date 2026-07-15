const db = require("../db");
const { featuredListings, products, users, orders, settings, sellerTiers } = require("../db/schema");
const { eq, and, or, gt, gte, lte, desc, ilike, sql } = require("drizzle-orm");
const { createNotification } = require("../utils/notifications");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const DEFAULT_FEATURED_PRICES = { 2: 5.00, 7: 12.00, 14: 20.00 };

async function loadFeaturedPrices() {
  const prices = { ...DEFAULT_FEATURED_PRICES };
  try {
    const rows = await db.select().from(settings)
      .where(sql`${settings.key} LIKE 'featured_price_%'`);
    for (const row of rows) {
      const duration = parseInt(row.key.replace('featured_price_', ''), 10);
      if ([2, 7, 14].includes(duration)) {
        prices[duration] = parseFloat(row.value);
      }
    }
  } catch (e) { /* settings table may not exist yet */ }
  return prices;
}

async function calculatePromotionCost(sellerId, productId, duration) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) {
    throw Object.assign(new Error("Product not found"), { status: 404 });
  }
  if (product.userId !== sellerId) {
    throw Object.assign(new Error("You can only promote your own products"), { status: 403 });
  }

  const prices = await loadFeaturedPrices();
  let amount = prices[duration];
  if (!amount) {
    throw Object.assign(new Error("Invalid duration"), { status: 400 });
  }

  const [sellerUser] = await db.select({
    email: users.email,
    tierId: users.tierId,
    tierExpiresAt: users.tierExpiresAt,
  }).from(users).where(eq(users.id, sellerId)).limit(1);

  if (sellerUser?.email === 'store@nafa3ni.com') {
    return { amount: 0, originalAmount: amount, isFreeFromSlot: true, creditsApplied: 0 };
  }

  let isFreeFromSlot = false;
  let discountedAmount = amount;
  let creditsApplied = 0;

  if (sellerUser?.tierId && sellerUser.tierExpiresAt && new Date(sellerUser.tierExpiresAt) > new Date()) {
    const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, sellerUser.tierId)).limit(1);
    if (tier) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyPromos = await db.select()
        .from(featuredListings)
        .where(and(
          eq(featuredListings.sellerId, sellerId),
          gte(featuredListings.createdAt, startOfMonth)
        ));

      const sortedPromos = [...monthlyPromos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let freeSlotsUsed = 0;
      let totalDiscountUsed = 0;

      for (const p of sortedPromos) {
        if (p.amountPaid === 0) {
          if (tier.featuredListingsIncluded > 0 && p.duration <= (tier.freeFeaturedDuration || 7) && freeSlotsUsed < tier.featuredListingsIncluded) {
            freeSlotsUsed++;
          } else {
            const origPrice = prices[p.duration] || 0;
            totalDiscountUsed += origPrice;
          }
        } else {
          const origPrice = prices[p.duration] || 0;
          const discount = Math.max(0, origPrice - p.amountPaid);
          totalDiscountUsed += discount;
        }
      }

      if (tier.featuredListingsIncluded > 0 && duration <= (tier.freeFeaturedDuration || 7) && freeSlotsUsed < tier.featuredListingsIncluded) {
        isFreeFromSlot = true;
        discountedAmount = 0;
      } else if ((tier.monthlyPromotionCredits || 0) > 0) {
        const remainingCredits = Math.max(0, tier.monthlyPromotionCredits - totalDiscountUsed);
        if (remainingCredits > 0) {
          creditsApplied = Math.min(amount, remainingCredits);
          discountedAmount = Math.max(0, amount - creditsApplied);
        }
      }
    }
  }

  return { amount: discountedAmount, originalAmount: amount, isFreeFromSlot, creditsApplied };
}

const promoteProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { productId } = req.body;
    let { duration } = req.body;

    if (!productId || !duration) {
      return res.status(400).json({ message: "Product ID and duration are required" });
    }
    duration = parseInt(duration, 10);
    if (![2, 7, 14].includes(duration)) {
      return res.status(400).json({ message: "Duration must be 2, 7, or 14 days" });
    }

    // Check for duplicate active featured listing
    const now = new Date();
    const [existingFeatured] = await db.select()
      .from(featuredListings)
      .where(and(
        eq(featuredListings.productId, productId),
        eq(featuredListings.sellerId, sellerId),
        eq(featuredListings.isActive, true),
        gt(featuredListings.endDate, now)
      ))
      .limit(1);

    const { amount, originalAmount, isFreeFromSlot, creditsApplied } = await calculatePromotionCost(sellerId, productId, duration);

    if (amount > 0) {
      const [sellerUser] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, sellerId)).limit(1);
      if (sellerUser.balance < amount) {
        return res.status(400).json({ message: `Insufficient balance. Promotion costs $${amount.toFixed(2)}. Please top up your balance or pay by card.` });
      }
      await db.update(users).set({
        balance: sql`${users.balance} - ${amount}`,
        updatedAt: new Date(),
      }).where(eq(users.id, sellerId));
    }

    let endDate;
    let featured;
    let msg = `Product promoted for ${duration} days!`;

    if (existingFeatured) {
      endDate = new Date(existingFeatured.endDate);
      endDate.setDate(endDate.getDate() + duration);

      const [updated] = await db.update(featuredListings)
        .set({
          endDate,
          duration: existingFeatured.duration + duration,
          amountPaid: sql`${featuredListings.amountPaid} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(featuredListings.id, existingFeatured.id))
        .returning();
      featured = updated;
      msg = `Promotion successfully extended by ${duration} days!`;
    } else {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const [inserted] = await db.insert(featuredListings).values({
        productId, sellerId, duration, amountPaid: amount, endDate,
      }).returning();
      featured = inserted;
    }

    if (isFreeFromSlot) {
      msg += ` (free via tier slots)`;
    } else if (creditsApplied > 0) {
      msg += ` (discounted $${creditsApplied.toFixed(2)} via tier credits)`;
    }
    res.status(201).json({ message: msg, featured });
  } catch (error) {
    console.error("Error promoting product:", error);
    res.status(error.status || 500).json({ message: error.message || "Server Error" });
  }
};

const getPromotionPrices = async (req, res) => {
  const prices = await loadFeaturedPrices();
  res.json(prices);
};

const getActiveFeatured = async (req, res) => {
  try {
    const now = new Date();
    const active = await db.select()
      .from(featuredListings)
      .where(and(eq(featuredListings.isActive, true), gt(featuredListings.endDate, now)))
      .leftJoin(products, eq(featuredListings.productId, products.id));

    const formatted = active.map(f => ({
      ...f.featured_listings,
      product: f.products ? { id: f.products.id, title: f.products.title, thumbnail: (f.products.images || [])[0], price: f.products.price } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching active featured:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMyFeaturedListings = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const list = await db.select()
      .from(featuredListings)
      .where(eq(featuredListings.sellerId, sellerId))
      .leftJoin(products, eq(featuredListings.productId, products.id))
      .orderBy(desc(featuredListings.createdAt));

    const formatted = list.map(f => ({
      ...f.featured_listings,
      product: f.products ? { id: f.products.id, title: f.products.title, thumbnail: (f.products.images || [])[0] } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching my featured listings:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const adminSetFeaturedPrice = async (req, res) => {
  try {
    const { duration, price } = req.body;
    if (![2, 7, 14].includes(duration) || !price || price < 0) {
      return res.status(400).json({ message: "Invalid duration or price" });
    }
    const key = `featured_price_${duration}`;
    const value = parseFloat(price).toString();
    const [existing] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
    const prices = await loadFeaturedPrices();
    res.json({ message: `Featured price for ${duration} days set to $${price}`, prices });
  } catch (error) {
    console.error("Error setting featured price:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getRemainingFeaturedQuota = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const [sellerUser] = await db.select({
      tierId: users.tierId, tierExpiresAt: users.tierExpiresAt,
    }).from(users).where(eq(users.id, sellerId)).limit(1);

    const result = { total: 0, used: 0, remaining: 0, tierName: null, freeDuration: 7, freeListingsTotal: 0, freeListingsUsed: 0, freeListingsRemaining: 0 };

    if (sellerUser.tierId && sellerUser.tierExpiresAt && new Date(sellerUser.tierExpiresAt) > new Date()) {
      const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, sellerUser.tierId)).limit(1);
      if (tier) {
        const prices = await loadFeaturedPrices();
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyPromos = await db.select()
          .from(featuredListings)
          .where(and(
            eq(featuredListings.sellerId, sellerId),
            gte(featuredListings.createdAt, startOfMonth)
          ));

        const sortedPromos = [...monthlyPromos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        let freeSlotsUsed = 0;
        let discountUsed = 0;

        for (const p of sortedPromos) {
          if (p.amountPaid === 0) {
            if (tier.featuredListingsIncluded > 0 && p.duration <= (tier.freeFeaturedDuration || 7) && freeSlotsUsed < tier.featuredListingsIncluded) {
              freeSlotsUsed++;
            } else {
              const origPrice = prices[p.duration] || 0;
              discountUsed += origPrice;
            }
          } else {
            const origPrice = prices[p.duration] || 0;
            const discount = Math.max(0, origPrice - p.amountPaid);
            discountUsed += discount;
          }
        }

        result.total = tier.monthlyPromotionCredits || 0;
        result.used = discountUsed;
        result.remaining = Math.max(0, result.total - result.used);
        result.tierName = tier.name;
        result.freeDuration = tier.freeFeaturedDuration || 7;
        result.freeListingsTotal = tier.featuredListingsIncluded || 0;
        result.freeListingsUsed = freeSlotsUsed;
        result.freeListingsRemaining = Math.max(0, result.freeListingsTotal - freeSlotsUsed);
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching remaining quota:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const adminGetAllFeaturedListings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const search = req.query.search || '';
    const statusFilter = req.query.status || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(products.title, `%${search}%`),
        )
      );
    }
    if (statusFilter === 'active') {
      conditions.push(eq(featuredListings.isActive, true));
    } else if (statusFilter === 'expired') {
      conditions.push(eq(featuredListings.isActive, false));
    }
    if (dateFrom) {
      conditions.push(gte(featuredListings.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(featuredListings.createdAt, new Date(dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Summary
    const [summary] = await db.select({
      totalRevenue: sql`coalesce(sum(${featuredListings.amountPaid}), 0)`,
      activePromotions: sql`coalesce(count(case when ${featuredListings.isActive} = true then 1 end), 0)`,
      totalPromotions: sql`count(*)`,
    }).from(featuredListings)
      .leftJoin(products, eq(featuredListings.productId, products.id))
      .leftJoin(users, eq(featuredListings.sellerId, users.id))
      .where(whereClause);

    // Count for pagination
    const [{ count }] = await db.select({ count: sql`count(*)` })
      .from(featuredListings)
      .leftJoin(products, eq(featuredListings.productId, products.id))
      .leftJoin(users, eq(featuredListings.sellerId, users.id))
      .where(whereClause);
    const total = parseInt(count, 10);

    const rows = await db.select({
      featured: featuredListings,
      product: products,
      seller: users,
    })
      .from(featuredListings)
      .leftJoin(products, eq(featuredListings.productId, products.id))
      .leftJoin(users, eq(featuredListings.sellerId, users.id))
      .where(whereClause)
      .orderBy(desc(featuredListings.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map(r => ({
      ...r.featured,
      product: r.product ? { id: r.product.id, title: r.product.title, thumbnail: (r.product.images || [])[0], price: r.product.price } : null,
      seller: r.seller ? { id: r.seller.id, name: r.seller.name, email: r.seller.email, avatar: r.seller.avatar } : null,
    }));

    res.json({
      featured: data,
      total,
      page,
      pages: Math.ceil(total / limit),
      summary: {
        totalRevenue: parseFloat(summary.totalRevenue),
        activePromotions: parseInt(summary.activePromotions, 10),
        totalPromotions: parseInt(summary.totalPromotions, 10),
      },
    });
  } catch (error) {
    console.error("Error fetching all featured listings:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const createPromotionPaymentIntent = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { productId } = req.body;
    let { duration } = req.body;

    if (!productId || !duration) {
      return res.status(400).json({ message: "Product ID and duration are required" });
    }
    duration = parseInt(duration, 10);
    if (![2, 7, 14].includes(duration)) {
      return res.status(400).json({ message: "Duration must be 2, 7, or 14 days" });
    }



    const { amount } = await calculatePromotionCost(sellerId, productId, duration);
    if (amount <= 0) {
      return res.status(400).json({ message: "This promotion is free and does not require card payment." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        userId: String(sellerId),
        productId,
        duration: String(duration),
        type: "promotion",
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating promotion payment intent:", error);
    res.status(error.status || 500).json({ message: error.message || "Server Error" });
  }
};

const confirmPromotionPayment = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { paymentIntentId, productId, duration } = req.body;

    if (!paymentIntentId || !productId || !duration) {
      return res.status(400).json({ message: "Payment intent ID, product ID, and duration are required" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment has not been completed" });
    }

    const meta = paymentIntent.metadata;
    if (meta.type !== "promotion" || meta.userId !== String(sellerId) || meta.productId !== productId || meta.duration !== String(duration)) {
      return res.status(400).json({ message: "Payment intent metadata mismatch" });
    }

    const now = new Date();
    const [existingFeatured] = await db.select()
      .from(featuredListings)
      .where(and(
        eq(featuredListings.productId, productId),
        eq(featuredListings.sellerId, sellerId),
        eq(featuredListings.isActive, true),
        gt(featuredListings.endDate, now)
      ))
      .limit(1);

    const { amount } = await calculatePromotionCost(sellerId, productId, duration);

    let endDate;
    let featured;
    let msg = `Product promoted successfully via card payment!`;

    if (existingFeatured) {
      endDate = new Date(existingFeatured.endDate);
      endDate.setDate(endDate.getDate() + duration);

      const [updated] = await db.update(featuredListings)
        .set({
          endDate,
          duration: existingFeatured.duration + duration,
          amountPaid: sql`${featuredListings.amountPaid} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(featuredListings.id, existingFeatured.id))
        .returning();
      featured = updated;
      msg = `Promotion successfully extended by ${duration} days via card payment!`;
    } else {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const [inserted] = await db.insert(featuredListings).values({
        productId, sellerId, duration, amountPaid: amount, endDate,
      }).returning();
      featured = inserted;
    }

    res.status(201).json({ message: msg, featured });
  } catch (error) {
    console.error("Error confirming promotion payment:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const processFeaturedExpirations = async () => {
  try {
    const now = new Date();
    const result = await db.update(featuredListings)
      .set({ isActive: false })
      .where(and(eq(featuredListings.isActive, true), lte(featuredListings.endDate, now)))
      .returning();
    if (result.length > 0) {
      console.log(`[Featured Expiration] Deactivated ${result.length} expired promotions`);
    }
  } catch (error) {
    console.error("[Featured Expiration] Error processing expirations:", error);
  }
};

module.exports = {
  promoteProduct,
  getPromotionPrices,
  getActiveFeatured,
  getMyFeaturedListings,
  adminSetFeaturedPrice,
  getRemainingFeaturedQuota,
  adminGetAllFeaturedListings,
  createPromotionPaymentIntent,
  confirmPromotionPayment,
  processFeaturedExpirations
};