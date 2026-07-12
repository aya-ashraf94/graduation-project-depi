const db = require("../db");
const { featuredListings, products, users, orders, settings, sellerTiers } = require("../db/schema");
const { eq, and, or, gt, gte, lte, desc, ilike, sql } = require("drizzle-orm");
const { createNotification } = require("../utils/notifications");

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

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.userId !== sellerId) {
      return res.status(403).json({ message: "You can only promote your own products" });
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
    if (existingFeatured) {
      return res.status(400).json({ message: "This product is already actively promoted. Wait until the current promotion expires or extend it." });
    }

    const prices = await loadFeaturedPrices();
    let amount = prices[duration];

    // Check if seller's tier grants promotion credits
    const [sellerUser] = await db.select({
      balance: users.balance, tierId: users.tierId, tierExpiresAt: users.tierExpiresAt,
    }).from(users).where(eq(users.id, sellerId)).limit(1);
    if (!sellerUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (sellerUser.tierId && sellerUser.tierExpiresAt && new Date(sellerUser.tierExpiresAt) > new Date()) {
      const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, sellerUser.tierId)).limit(1);
      if (tier && (tier.monthlyPromotionCredits || 0) > 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        // Sum the value of all promotions covered by credits this month
        const freePromos = await db.select()
          .from(featuredListings)
          .where(and(
            eq(featuredListings.sellerId, sellerId),
            gte(featuredListings.createdAt, startOfMonth),
            eq(featuredListings.amountPaid, 0)
          ));
        const usedCredits = freePromos.reduce((sum, p) => sum + (prices[p.duration] || 0), 0);
        const remaining = tier.monthlyPromotionCredits - usedCredits;
        if (remaining >= amount) {
          amount = 0;
        }
      }
    }

    if (amount > 0 && sellerUser.balance < amount) {
      return res.status(400).json({ message: `Insufficient balance. Promotion costs $${amount.toFixed(2)}. Please top up your balance.` });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    if (amount > 0) {
      await db.update(users).set({
        balance: sql`${users.balance} - ${amount}`,
        updatedAt: new Date(),
      }).where(eq(users.id, sellerId));
    }

    const [featured] = await db.insert(featuredListings).values({
      productId, sellerId, duration, amountPaid: amount, endDate,
    }).returning();

    const msg = amount === 0
      ? `Product promoted for ${duration} days (free via tier benefits)!`
      : `Product promoted for ${duration} days!`;
    res.status(201).json({ message: msg, featured });
  } catch (error) {
    console.error("Error promoting product:", error);
    res.status(500).json({ message: "Server Error" });
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

    const result = { total: 0, used: 0, remaining: 0, tierName: null, freeDuration: 7 };

    if (sellerUser.tierId && sellerUser.tierExpiresAt && new Date(sellerUser.tierExpiresAt) > new Date()) {
      const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, sellerUser.tierId)).limit(1);
      if (tier && (tier.monthlyPromotionCredits || 0) > 0) {
        const prices = await loadFeaturedPrices();
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        // Sum the value of free promotions this month
        const freePromos = await db.select()
          .from(featuredListings)
          .where(and(
            eq(featuredListings.sellerId, sellerId),
            gte(featuredListings.createdAt, startOfMonth),
            eq(featuredListings.amountPaid, 0)
          ));
        const usedCredits = freePromos.reduce((sum, p) => sum + (prices[p.duration] || 0), 0);
        result.total = tier.monthlyPromotionCredits;
        result.used = usedCredits;
        result.remaining = Math.max(0, result.total - result.used);
        result.tierName = tier.name;
        result.freeDuration = tier.freeFeaturedDuration || 7;
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

module.exports = { promoteProduct, getPromotionPrices, getActiveFeatured, getMyFeaturedListings, adminSetFeaturedPrice, getRemainingFeaturedQuota, adminGetAllFeaturedListings };