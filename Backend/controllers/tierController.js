const db = require("../db");
const { sellerTiers, users, subscriptionTransactions } = require("../db/schema");
const { eq, and, desc, lte, gte, sql } = require("drizzle-orm");
const { createNotification } = require("../utils/notifications");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
      monthlyPromotionCredits: req.body.monthlyPromotionCredits !== undefined ? parseFloat(req.body.monthlyPromotionCredits) : 0,
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
    const fields = ["name", "description", "feePercent", "monthlyPrice", "yearlyPrice", "featuredListingsIncluded", "monthlyPromotionCredits", "badgeLabel", "isActive"];
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

const createSubscriptionPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tierId, billingCycle } = req.body;

    if (!tierId || !billingCycle) {
      return res.status(400).json({ message: "Tier ID and billing cycle are required" });
    }

    const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, tierId)).limit(1);
    if (!tier || !tier.isActive) {
      return res.status(404).json({ message: "Tier not found or inactive" });
    }

    const price = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;
    if (price <= 0) {
      return res.status(400).json({ message: "Free tiers do not require payment" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100),
      currency: "usd",
      metadata: {
        userId: String(userId),
        tierId,
        billingCycle,
        type: "subscription",
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating subscription payment intent:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const confirmSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId, tierId, billingCycle, autoRenew } = req.body;

    if (!paymentIntentId || !tierId || !billingCycle) {
      return res.status(400).json({ message: "Payment intent ID, tier ID, and billing cycle are required" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment has not been completed" });
    }

    const meta = paymentIntent.metadata;
    if (meta.type !== "subscription" || meta.userId !== String(userId) || meta.tierId !== tierId) {
      return res.status(400).json({ message: "Payment intent metadata mismatch" });
    }

    // Retrieve the user to check for a current subscription
    const [currentUser] = await db.select({
      tierId: users.tierId, tierExpiresAt: users.tierExpiresAt,
      balance: users.balance,
    }).from(users).where(eq(users.id, userId)).limit(1);

    const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, tierId)).limit(1);
    if (!tier || !tier.isActive) {
      return res.status(404).json({ message: "Tier not found or inactive" });
    }

    const price = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;

    let expiresAt;
    if (currentUser.tierId === tierId && currentUser.tierExpiresAt && new Date(currentUser.tierExpiresAt) > new Date()) {
      // Renew — extend existing expiry
      expiresAt = new Date(currentUser.tierExpiresAt);
      const months = billingCycle === "monthly" ? 1 : 12;
      expiresAt.setMonth(expiresAt.getMonth() + months);
    } else {
      // New subscription (or switching tiers)
      expiresAt = new Date();
      const months = billingCycle === "monthly" ? 1 : 12;
      expiresAt.setMonth(expiresAt.getMonth() + months);

      // Proration: if switching from an active paid tier, credit remaining value
      if (currentUser.tierId && currentUser.tierId !== tierId && currentUser.tierExpiresAt && new Date(currentUser.tierExpiresAt) > new Date()) {
        const [oldTier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, currentUser.tierId)).limit(1);
        if (oldTier) {
          const oldPrice = billingCycle === "monthly" ? oldTier.monthlyPrice : oldTier.yearlyPrice;
          const totalMs = billingCycle === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
          const remainingMs = new Date(currentUser.tierExpiresAt).getTime() - Date.now();
          const remainingRatio = Math.max(0, remainingMs / totalMs);
          const prorateCredit = oldPrice * remainingRatio;
          if (prorateCredit > 0) {
            await db.update(users).set({
              balance: sql`${users.balance} + ${prorateCredit}`,
              updatedAt: new Date(),
            }).where(eq(users.id, userId));
            console.log(`[Proration] Credited user ${userId} $${prorateCredit.toFixed(2)} for unused ${oldTier.name} tier`);
          }
        }
      }
    }

    // Mark payment intent as consumed to prevent reuse
    await db.update(users).set({
      tierId,
      tierExpiresAt: expiresAt,
      autoRenew: autoRenew === true,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    await db.insert(subscriptionTransactions).values({
      userId, tierId, amount: price, billingCycle,
      status: 'completed', stripePaymentIntentId: paymentIntentId,
      tierName: tier.name,
    });

    await createNotification({
      userId, type: "system",
      title: `Subscribed to ${tier.name}`,
      body: `Your ${tier.name} tier subscription is active until ${expiresAt.toISOString().split('T')[0]}.`,
      linkedRoute: "/earnings",
    });

    res.json({ message: `Subscribed to ${tier.name} tier (${billingCycle})`, tier, expiresAt });
  } catch (error) {
    console.error("Error confirming subscription payment:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const subscribeToTier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tierId, billingCycle, autoRenew, paymentIntentId } = req.body;

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

    // If a Stripe PaymentIntent was used, validate and skip wallet deduction
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ message: "Payment has not been completed" });
      }
      const meta = paymentIntent.metadata;
      if (meta.type !== "subscription" || meta.userId !== String(userId) || meta.tierId !== tierId) {
        return res.status(400).json({ message: "Payment intent metadata mismatch" });
      }
    }

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

        if (!paymentIntentId && price > 0) {
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

        await db.insert(subscriptionTransactions).values({
          userId, tierId: tier.id, amount: price, billingCycle,
          status: 'completed',
          tierName: tier.name,
        });

        res.json({ message: `Renewed ${tier.name} tier (${billingCycle}) — extended to ${newExpiresAt.toISOString().split('T')[0]}`, tier, expiresAt: newExpiresAt });
      } else {
        const months = billingCycle === "monthly" ? 1 : 12;
        const expiresAt = price > 0 ? (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + months);
          return d;
        })() : null;

        // Proration: if switching from an active paid tier, credit remaining value
        if (!paymentIntentId && user.tierId && user.tierId !== tierId && user.tierExpiresAt && new Date(user.tierExpiresAt) > new Date()) {
          const [oldTier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, user.tierId)).limit(1);
          if (oldTier) {
            const oldPrice = billingCycle === "monthly" ? oldTier.monthlyPrice : oldTier.yearlyPrice;
            const totalMs = billingCycle === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
            const remainingMs = new Date(user.tierExpiresAt).getTime() - Date.now();
            const remainingRatio = Math.max(0, remainingMs / totalMs);
            const prorateCredit = oldPrice * remainingRatio;
            if (prorateCredit > 0) {
              await tx.update(users).set({
                balance: sql`${users.balance} + ${prorateCredit}`,
                updatedAt: new Date(),
              }).where(eq(users.id, userId));
            }
          }
        }

        if (!paymentIntentId && price > 0) {
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

        await createNotification({
          userId, type: "system",
          title: `Subscribed to ${tier.name}`,
          body: `Your ${tier.name} tier subscription is active until ${expiresAt.toISOString().split('T')[0]}.`,
          linkedRoute: "/earnings",
        });

        await db.insert(subscriptionTransactions).values({
          userId, tierId: tier.id, amount: price, billingCycle,
          status: 'completed',
          tierName: tier.name,
        });

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

    // Free tier is the default state — never treat it as an active subscription
    if (!tier || tier.monthlyPrice === 0) {
      return res.json({ subscribed: false });
    }

    res.json({
      subscribed: true,
      tier,
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
      // Cancel at period end — no refund, keep benefits until expiry
      await db.update(users).set({ cancelAtPeriodEnd: true, autoRenew: false, updatedAt: new Date() }).where(eq(users.id, userId));
      await createNotification({
        userId, type: "system",
        title: "Subscription Cancelled",
        body: "Your subscription will be cancelled at the end of the current billing period.",
        linkedRoute: "/earnings",
      });
      return res.json({ message: "Subscription will be cancelled at the end of the current billing period" });
    }

    // Immediate cancel with prorated refund
    const [user] = await db.select({
      tierId: users.tierId, tierExpiresAt: users.tierExpiresAt, balance: users.balance,
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.tierId) {
      return res.status(400).json({ message: "No active subscription to cancel" });
    }

    // Find the latest subscription transaction for this user on their current tier
    const [lastTx] = await db.select()
      .from(subscriptionTransactions)
      .where(and(
        eq(subscriptionTransactions.userId, userId),
        eq(subscriptionTransactions.tierId, user.tierId),
      ))
      .orderBy(desc(subscriptionTransactions.createdAt))
      .limit(1);

    let refundAmount = 0;

    if (lastTx && lastTx.amount > 0 && user.tierExpiresAt) {
      const now = Date.now();
      const expiresAt = new Date(user.tierExpiresAt).getTime();
      const periodMs = expiresAt - new Date(lastTx.createdAt).getTime();
      const remainingMs = expiresAt - now;
      const remainingRatio = remainingMs / periodMs;

      if (remainingRatio > 0.01) {
        refundAmount = Math.round(lastTx.amount * remainingRatio * 100) / 100;

        // Refund via Stripe if paid by card
        if (lastTx.stripePaymentIntentId) {
          try {
            await stripe.refunds.create({ payment_intent: lastTx.stripePaymentIntentId, amount: Math.round(refundAmount * 100) });
          } catch (stripeErr) {
            console.error("Stripe refund failed, crediting wallet instead:", stripeErr.message);
            refundAmount = 0;
          }
        }

        // Credit refund to wallet (if not already handled by Stripe)
        if (!lastTx.stripePaymentIntentId && refundAmount > 0) {
          await db.update(users).set({
            balance: sql`${users.balance} + ${refundAmount}`,
            updatedAt: new Date(),
          }).where(eq(users.id, userId));
        }
      }
    }

    // Immediately set to Free tier
    await db.update(users).set({
      tierId: null, tierExpiresAt: null, autoRenew: false, cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    // Record refund transaction
    if (refundAmount > 0) {
      await db.insert(subscriptionTransactions).values({
        userId, tierId: user.tierId, amount: -refundAmount,
        billingCycle: lastTx?.billingCycle || 'monthly',
        status: 'refunded',
        tierName: lastTx?.tierName || 'Unknown',
      });
    }

    const refundMsg = refundAmount > 0 ? ` $${refundAmount.toFixed(2)} has been refunded.` : '';
    await createNotification({
      userId, type: "system",
      title: "Subscription Cancelled & Refunded",
      body: `Your subscription has been cancelled immediately.${refundMsg} You are now on the Free tier.`,
      linkedRoute: "/earnings",
    });

    res.json({ message: `Subscription cancelled immediately.${refundMsg}`, refundAmount });
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
        linkedRoute: "/earnings",
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
              linkedRoute: "/earnings",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("[Tier Renewal] Error processing renewals:", error);
  }
};

module.exports = { getTiers, getActiveTiers, adminCreateTier, adminUpdateTier, adminDeleteTier, subscribeToTier, getMySubscription, cancelSubscription, toggleAutoRenew, processTierRenewals, createSubscriptionPaymentIntent, confirmSubscriptionPayment };