const db = require("../db");
const { featuredListings, products, users, orders } = require("../db/schema");
const { eq, and, gt, desc, sql } = require("drizzle-orm");
const { createNotification } = require("../utils/notifications");

const FEATURED_PRICES = { 2: 5.00, 7: 12.00, 14: 20.00 };

const promoteProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { productId, duration } = req.body;

    if (!productId || !duration) {
      return res.status(400).json({ message: "Product ID and duration are required" });
    }
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

    const amount = FEATURED_PRICES[duration];
    const [seller] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, sellerId)).limit(1);
    if (!seller || seller.balance < amount) {
      return res.status(400).json({ message: `Insufficient balance. Promotion costs $${amount.toFixed(2)}. Please top up your balance.` });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    await db.update(users).set({
      balance: sql`${users.balance} - ${amount}`,
      updatedAt: new Date(),
    }).where(eq(users.id, sellerId));

    const [featured] = await db.insert(featuredListings).values({
      productId, sellerId, duration, amountPaid: amount, endDate,
    }).returning();

    res.status(201).json({ message: `Product promoted for ${duration} days!`, featured });
  } catch (error) {
    console.error("Error promoting product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getPromotionPrices = async (req, res) => {
  res.json(FEATURED_PRICES);
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
    FEATURED_PRICES[duration] = parseFloat(price);
    res.json({ message: `Featured price for ${duration} days set to $${price}`, prices: FEATURED_PRICES });
  } catch (error) {
    console.error("Error setting featured price:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { promoteProduct, getPromotionPrices, getActiveFeatured, getMyFeaturedListings, adminSetFeaturedPrice };