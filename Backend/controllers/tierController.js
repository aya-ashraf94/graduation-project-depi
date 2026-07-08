const db = require("../db");
const { sellerTiers, users } = require("../db/schema");
const { eq, desc, sql } = require("drizzle-orm");
const { createNotification } = require("../utils/notifications");

const getTiers = async (req, res) => {
  try {
    const tiers = await db.select().from(sellerTiers).orderBy(desc(sellerTiers.monthlyPrice));
    res.json(tiers);
  } catch (error) {
    console.error("Error fetching tiers:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getActiveTiers = async (req, res) => {
  try {
    const tiers = await db.select().from(sellerTiers).where(eq(sellerTiers.isActive, true)).orderBy(desc(sellerTiers.monthlyPrice));
    res.json(tiers);
  } catch (error) {
    console.error("Error fetching active tiers:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const adminCreateTier = async (req, res) => {
  try {
    const { name, description, feePercent, monthlyPrice, yearlyPrice, featuredListingsIncluded, badgeLabel } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Tier name is required" });
    }

    const [tier] = await db.insert(sellerTiers).values({
      name,
      description: description || null,
      feePercent: feePercent !== undefined ? parseFloat(feePercent) : null,
      monthlyPrice: monthlyPrice !== undefined ? parseFloat(monthlyPrice) : 0,
      yearlyPrice: yearlyPrice !== undefined ? parseFloat(yearlyPrice) : 0,
      featuredListingsIncluded: featuredListingsIncluded !== undefined ? parseInt(featuredListingsIncluded) : 0,
      badgeLabel: badgeLabel || null,
    }).returning();

    res.status(201).json(tier);
  } catch (error) {
    console.error("Error creating tier:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const adminUpdateTier = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ["name", "description", "feePercent", "monthlyPrice", "yearlyPrice", "featuredListingsIncluded", "badgeLabel", "isActive"];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates[field] = field === "feePercent" || field === "monthlyPrice" || field === "yearlyPrice"
          ? parseFloat(req.body[field])
          : field === "featuredListingsIncluded"
            ? parseInt(req.body[field])
            : req.body[field];
      }
    }
    updates.updatedAt = new Date();

    const [tier] = await db.update(sellerTiers).set(updates).where(eq(sellerTiers.id, id)).returning();
    if (!tier) {
      return res.status(404).json({ message: "Tier not found" });
    }
    res.json(tier);
  } catch (error) {
    console.error("Error updating tier:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const adminDeleteTier = async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(users).set({ tierId: null, tierExpiresAt: null, updatedAt: new Date() }).where(eq(users.tierId, id));
    const [tier] = await db.delete(sellerTiers).where(eq(sellerTiers.id, id)).returning();
    if (!tier) {
      return res.status(404).json({ message: "Tier not found" });
    }
    res.json({ message: "Tier deleted successfully" });
  } catch (error) {
    console.error("Error deleting tier:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const subscribeToTier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tierId, billingCycle } = req.body;

    if (!tierId || !billingCycle) {
      return res.status(400).json({ message: "Tier ID and billing cycle (monthly/yearly) are required" });
    }
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return res.status(400).json({ message: "Billing cycle must be monthly or yearly" });
    }

    const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, tierId)).limit(1);
    if (!tier || !tier.isActive) {
      return res.status(404).json({ message: "Tier not found or inactive" });
    }

    const price = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;
    if (price > 0) {
      const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1);
      if (!user || user.balance < price) {
        return res.status(400).json({ message: `Insufficient balance. Subscription costs $${price.toFixed(2)}.` });
      }
      await db.update(users).set({
        balance: sql`${users.balance} - ${price}`,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
    }

    const months = billingCycle === "monthly" ? 1 : 12;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await db.update(users).set({
      tierId,
      tierExpiresAt: expiresAt,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    res.json({ message: `Subscribed to ${tier.name} tier (${billingCycle})`, tier, expiresAt });
  } catch (error) {
    console.error("Error subscribing to tier:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.select({ tierId: users.tierId, tierExpiresAt: users.tierExpiresAt })
      .from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.tierId) {
      return res.json({ subscribed: false });
    }

    const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, user.tierId)).limit(1);
    res.json({
      subscribed: true,
      tier: tier || null,
      expiresAt: user.tierExpiresAt,
      isExpired: user.tierExpiresAt ? new Date(user.tierExpiresAt) < new Date() : false,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.update(users).set({ tierId: null, tierExpiresAt: null, updatedAt: new Date() }).where(eq(users.id, userId));
    res.json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getTiers, getActiveTiers, adminCreateTier, adminUpdateTier, adminDeleteTier, subscribeToTier, getMySubscription, cancelSubscription };