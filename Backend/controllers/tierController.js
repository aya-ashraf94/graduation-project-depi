const db = require("../db");
const { sellerTiers, users } = require("../db/schema");
const { eq, and, desc, lte, gte, sql } = require("drizzle-orm");
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

    const tierFeePercent = feePercent !== undefined ? parseFloat(feePercent) : null;
    if (tierFeePercent === null && req.body.feePercent === undefined) {
      // Default behavior: null = inherit global fee
    } else if (tierFeePercent !== null && (tierFeePercent < 0 || tierFeePercent > 100)) {
      return res.status(400).json({ message: "feePercent must be between 0 and 100, or null to inherit the global platform fee" });
    }

    const [tier] = await db.insert(sellerTiers).values({
      name,
      description: description || null,
      feePercent: tierFeePercent,
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
    const { tierId, billingCycle, autoRenew } = req.body;

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

    await db.transaction(async (tx) => {
      const [user] = await tx.select({
        balance: users.balance, tierId: users.tierId, tierExpiresAt: users.tierExpiresAt,
      }).from(users).where(eq(users.id, userId)).limit(1);

      if (user.tierId === tierId && user.tierExpiresAt && new Date(user.tierExpiresAt) > new Date()) {
        // Renew existing subscription — extend the current expiry
        const months = billingCycle === "monthly" ? 1 : 12;
        const newExpiry = new Date(user.tierExpiresAt);
        newExpiry.setMonth(newExpiry.getMonth() + months);
        const newExpiresAt = newExpiry;

        if (price > 0) {
          if (user.balance < price) {
            throw Object.assign(new Error(`Insufficient balance. Renewal costs $${price.toFixed(2)}.`), { status: 400 });
          }
          await tx.update(users).set({
            balance: sql`${users.balance} - ${price}`,
            updatedAt: new Date(),
          }).where(eq(users.id, userId));
        }

        await tx.update(users).set({
          tierExpiresAt: newExpiresAt,
          autoRenew: autoRenew === true,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        }).where(eq(users.id, userId));

        res.json({ message: `Renewed ${tier.name} tier (${billingCycle}) — extended to ${newExpiresAt.toISOString().split('T')[0]}`, tier, expiresAt: newExpiresAt });
      } else {
        const months = billingCycle === "monthly" ? 1 : 12;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);

        if (price > 0) {
          if (user.balance < price) {
            throw Object.assign(new Error(`Insufficient balance. Subscription costs $${price.toFixed(2)}.`), { status: 400 });
          }
          await tx.update(users).set({
            balance: sql`${users.balance} - ${price}`,
            updatedAt: new Date(),
          }).where(eq(users.id, userId));
        }

        await tx.update(users).set({
          tierId,
          tierExpiresAt: expiresAt,
          autoRenew: autoRenew === true,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        }).where(eq(users.id, userId));

        res.json({ message: `Subscribed to ${tier.name} tier (${billingCycle})`, tier, expiresAt });
      }
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error subscribing to tier:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.select({
      tierId: users.tierId, tierExpiresAt: users.tierExpiresAt,
      autoRenew: users.autoRenew, cancelAtPeriodEnd: users.cancelAtPeriodEnd,
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.tierId) {
      return res.json({ subscribed: false });
    }

    const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, user.tierId)).limit(1);
    res.json({
      subscribed: true,
      tier: tier || null,
      expiresAt: user.tierExpiresAt,
      isExpired: user.tierExpiresAt ? new Date(user.tierExpiresAt) < new Date() : false,
      autoRenew: user.autoRenew,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { atPeriodEnd } = req.body;
    if (atPeriodEnd) {
      await db.update(users).set({ cancelAtPeriodEnd: true, autoRenew: false, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ message: "Subscription will be cancelled at the end of the current billing period" });
    } else {
      await db.update(users).set({ tierId: null, tierExpiresAt: null, autoRenew: false, cancelAtPeriodEnd: false, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ message: "Subscription cancelled immediately" });
    }
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const toggleAutoRenew = async (req, res) => {
  try {
    const userId = req.user.id;
    const { autoRenew } = req.body;
    if (autoRenew === undefined) {
      return res.status(400).json({ message: "autoRenew field is required" });
    }
    await db.update(users).set({
      autoRenew: autoRenew === true,
      cancelAtPeriodEnd: autoRenew === true ? false : undefined,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    res.json({ message: autoRenew ? "Auto-renew enabled" : "Auto-renew disabled", autoRenew: autoRenew === true });
  } catch (error) {
    console.error("Error toggling auto-renew:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const processTierRenewals = async () => {
  try {
    const now = new Date();

    // Notify users whose tier expires within 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await db.select({
      id: users.id, name: users.name, tierExpiresAt: users.tierExpiresAt,
      autoRenew: users.autoRenew, cancelAtPeriodEnd: users.cancelAtPeriodEnd, balance: users.balance,
      tierId: users.tierId,
    }).from(users).where(and(
      lte(users.tierExpiresAt, threeDaysFromNow),
      gte(users.tierExpiresAt, now),
    ));

    for (const user of expiringSoon) {
      // Send pre-expiry notification (3 days before)
      await createNotification({
        userId: user.id,
        type: "system",
        title: "Tier Subscription Expiring Soon",
        body: `Your seller tier subscription expires on ${user.tierExpiresAt.toISOString().split('T')[0]}.${user.autoRenew ? ' Auto-renew is enabled.' : ' Renew now to keep your benefits.'}`,
        linkedRoute: "/profile/me?tab=subscription",
      });

      // Auto-renew if enabled and not cancelled
      if (user.autoRenew && !user.cancelAtPeriodEnd && user.tierId) {
        const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, user.tierId)).limit(1);
        if (tier && tier.isActive) {
          const price = tier.monthlyPrice; // Default to monthly price for auto-renew
          if (user.balance >= price) {
            const months = 1;
            const newExpiry = new Date(user.tierExpiresAt);
            newExpiry.setMonth(newExpiry.getMonth() + months);

            await db.transaction(async (tx) => {
              await tx.update(users).set({
                balance: sql`${users.balance} - ${price}`,
                tierExpiresAt: newExpiry,
                updatedAt: new Date(),
              }).where(eq(users.id, user.id));
            });

            console.log(`[Tier Renewal] Auto-renewed tier for user ${user.id}, extended to ${newExpiry.toISOString()}`);
          } else {
            console.log(`[Tier Renewal] User ${user.id} has insufficient balance for auto-renew (need $${price}, have $${user.balance})`);
            await createNotification({
              userId: user.id,
              type: "system",
              title: "Auto-Renew Failed",
              body: `We couldn't auto-renew your ${tier.name} tier. Insufficient balance ($${price.toFixed(2)} needed). Please top up your wallet.`,
              linkedRoute: "/profile/me?tab=wallet",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("[Tier Renewal] Error processing renewals:", error);
  }
};

module.exports = { getTiers, getActiveTiers, adminCreateTier, adminUpdateTier, adminDeleteTier, subscribeToTier, getMySubscription, cancelSubscription, toggleAutoRenew, processTierRenewals };