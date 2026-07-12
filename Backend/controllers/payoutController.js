const db = require("../db");
const { payouts, users, orders, products, settings, subscriptionTransactions, sellerTiers } = require("../db/schema");
const { eq, and, desc, sql, lte } = require("drizzle-orm");
const { alias } = require("drizzle-orm/pg-core");
const { createNotification } = require("../utils/notifications");

const AUTO_PAYOUT_DAYS_DEFAULT = 3;

/**
 * Request a payout (Seller)
 */
const requestPayout = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { amount, paymentMethod, paymentDetails } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid payout amount" });
    }

    if (!paymentMethod || !paymentDetails) {
      return res.status(400).json({ message: "Payment method and details are required" });
    }

    const requestedAmount = parseFloat(amount);

    // Fetch seller balance
    const [seller] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, sellerId)).limit(1);
    if (!seller) {
      return res.status(404).json({ message: "User not found" });
    }

    if (seller.balance < requestedAmount) {
      return res.status(400).json({ message: "Insufficient balance for this withdrawal" });
    }

    // Deduct immediately to lock the funds
    await db.update(users)
      .set({ balance: sql`${users.balance} - ${requestedAmount}`, updatedAt: new Date() })
      .where(eq(users.id, sellerId));

    // Insert payout record
    const [payout] = await db.insert(payouts).values({
      sellerId,
      amount: requestedAmount,
      status: "pending",
      paymentMethod,
      paymentDetails,
    }).returning();

    res.status(201).json({ message: "Payout request submitted successfully", payout });
  } catch (error) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Get current user's payouts history (Seller)
 */
const getMyPayouts = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const history = await db.select()
      .from(payouts)
      .where(eq(payouts.sellerId, sellerId))
      .orderBy(desc(payouts.createdAt));

    res.json(history);
  } catch (error) {
    console.error("Error fetching payouts:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Get wallet stats for the current user (Seller)
 */
const getWalletStats = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Available (withdrawable) balance
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, sellerId)).limit(1);
    const balance = user ? user.balance : 0;

    // Pending balance (orders shipped/pending, net of platform fee)
    const [pendingResult] = await db.select({
      value: sql`COALESCE(SUM(${orders.price} - ${orders.platformFee}), 0)`
    }).from(orders)
      .where(and(
        eq(orders.sellerId, sellerId),
        eq(orders.paymentMethod, "online"),
        sql`${orders.status} IN ('pending', 'shipped')`
      ));
    const pendingBalance = Number(pendingResult?.value || 0);

    // Lifetime COD fees deducted from seller wallet
    const [codFeesResult] = await db.select({
      value: sql`COALESCE(SUM(${orders.platformFee}), 0)`
    }).from(orders)
      .where(and(
        eq(orders.sellerId, sellerId),
        eq(orders.paymentMethod, "cash_on_delivery"),
        eq(orders.status, "delivered")
      ));
    const totalCodFeesDeducted = Number(codFeesResult?.value || 0);

    // Lifetime earnings (all-time delivered online orders, net of platform fee)
    // Total effective earnings = online net earnings + COD fees deducted (negative)
    const [earningsResult] = await db.select({
      value: sql`COALESCE(SUM(${orders.price} - ${orders.platformFee}), 0)`
    }).from(orders)
      .where(and(
        eq(orders.sellerId, sellerId),
        eq(orders.paymentMethod, "online"),
        eq(orders.status, "delivered")
      ));
    const lifetimeEarnings = Number(earningsResult?.value || 0) - totalCodFeesDeducted;

    // Recent transactions (last 20 delivered/paid orders for this seller)
    const recentOrders = await db.select({
      id: orders.id,
      price: orders.price,
      platformFee: orders.platformFee,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
      productTitle: products.title,
      productThumbnail: products.images,
    }).from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .where(and(
        eq(orders.sellerId, sellerId),
        sql`${orders.status} IN ('delivered', 'shipped', 'pending')`
      ))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    // Recent subscription transactions
    const recentSubTx = await db.select({
      id: subscriptionTransactions.id,
      amount: subscriptionTransactions.amount,
      billingCycle: subscriptionTransactions.billingCycle,
      status: subscriptionTransactions.status,
      tierName: subscriptionTransactions.tierName,
      createdAt: subscriptionTransactions.createdAt,
    }).from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.userId, sellerId))
      .orderBy(desc(subscriptionTransactions.createdAt))
      .limit(20);

    const subTransactions = recentSubTx.map(s => {
      const isRefund = s.status === 'refunded';
      return {
        id: s.id,
        productTitle: isRefund ? `Refund — ${s.tierName} (${s.billingCycle})` : `${s.tierName} (${s.billingCycle})`,
        productThumbnail: '',
        amount: s.amount,
        platformFee: 0,
        netEarnings: isRefund ? Math.abs(s.amount) : -s.amount,
        status: s.status,
        paymentMethod: 'card',
        createdAt: s.createdAt,
        type: isRefund ? 'refund' : 'subscription',
      };
    });

    const orderTransactions = recentOrders.map(o => ({
      id: o.id,
      productTitle: o.productTitle || 'Unknown Product',
      productThumbnail: (o.productThumbnail || [])[0] || '',
      amount: o.price,
      platformFee: o.platformFee || 0,
      netEarnings: (o.price || 0) - (o.platformFee || 0),
      status: o.status,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      type: 'order',
    }));

    // Merge and sort by most recent
    const recentTransactions = [...orderTransactions, ...subTransactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    res.json({
      balance,
      pendingBalance,
      lifetimeEarnings,
      totalCodFeesDeducted,
      recentTransactions,
    });
  } catch (error) {
    console.error("Error getting wallet stats:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * List all payout requests (Admin)
 */
const adminGetPayouts = async (req, res) => {
  try {
    const list = await db.select({
      id: payouts.id,
      amount: payouts.amount,
      status: payouts.status,
      paymentMethod: payouts.paymentMethod,
      paymentDetails: payouts.paymentDetails,
      createdAt: payouts.createdAt,
      updatedAt: payouts.updatedAt,
      sellerId: payouts.sellerId,
      sellerName: users.name,
      sellerEmail: users.email,
    })
      .from(payouts)
      .leftJoin(users, eq(payouts.sellerId, users.id))
      .orderBy(desc(payouts.createdAt));

    res.json(list);
  } catch (error) {
    console.error("Error listing payouts for admin:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Approve or Reject a payout (Admin)
 */
const adminUpdatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid payout status" });
    }

    const [payout] = await db.select().from(payouts).where(eq(payouts.id, id)).limit(1);
    if (!payout) {
      return res.status(404).json({ message: "Payout request not found" });
    }

    if (payout.status !== "pending") {
      return res.status(400).json({ message: "This payout request has already been processed" });
    }

    // Process update
    await db.update(payouts)
      .set({ status, updatedAt: new Date() })
      .where(eq(payouts.id, id));

    if (status === "rejected") {
      // Refund back to seller's balance
      await db.update(users)
        .set({ balance: sql`${users.balance} + ${payout.amount}`, updatedAt: new Date() })
        .where(eq(users.id, payout.sellerId));

      await createNotification({
        userId: payout.sellerId,
        type: "system",
        title: "Payout Request Rejected ❌",
        body: `Your payout request for $${payout.amount} was rejected. The funds have been refunded to your balance.`,
        linkedRoute: "/profile/me?tab=wallet",
      });
    } else {
      // Approved
      await createNotification({
        userId: payout.sellerId,
        type: "system",
        title: "Payout Approved! 💸",
        body: `Your payout request for $${payout.amount} has been approved and processed!`,
        linkedRoute: "/profile/me?tab=wallet",
      });
    }

    res.json({ message: `Payout request ${status} successfully` });
  } catch (error) {
    console.error("Error updating payout status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Get auto-payout settings (days after delivery before auto-approval)
 */
const getAutoPayoutSettings = async (req, res) => {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'autoPayoutDays'));
    const days = row ? parseInt(row.value) : AUTO_PAYOUT_DAYS_DEFAULT;
    res.json({ autoPayoutDays: days, enabled: days > 0 });
  } catch (error) {
    res.json({ autoPayoutDays: AUTO_PAYOUT_DAYS_DEFAULT, enabled: true });
  }
};

/**
 * Update auto-payout settings (admin)
 */
const updateAutoPayoutSettings = async (req, res) => {
  try {
    const { days } = req.body;
    if (days === undefined || isNaN(parseInt(days)) || parseInt(days) < 0) {
      return res.status(400).json({ message: "Days must be a non-negative integer (0 to disable)" });
    }
    const numericDays = parseInt(days);
    const [existing] = await db.select().from(settings).where(eq(settings.key, 'autoPayoutDays'));
    if (existing) {
      await db.update(settings).set({ value: numericDays.toString() }).where(eq(settings.key, 'autoPayoutDays'));
    } else {
      await db.insert(settings).values({ key: 'autoPayoutDays', value: numericDays.toString() });
    }
    res.json({ message: `Auto-payout set to ${numericDays} days after delivery`, autoPayoutDays: numericDays });
  } catch (error) {
    console.error("Error updating auto-payout settings:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Process auto-payouts: approve pending payouts for delivered orders
 * that have passed the auto-payout waiting period.
 * Called by a scheduled interval or manually by admin.
 */
const processAutoPayouts = async (req, res) => {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'autoPayoutDays'));
    const days = row ? parseInt(row.value) : AUTO_PAYOUT_DAYS_DEFAULT;
    if (days <= 0) {
      const result = { message: "Auto-payout is disabled", processed: 0 };
      if (res) return res.json(result);
      return result;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const eligiblePayouts = await db.select()
      .from(payouts)
      .where(and(eq(payouts.status, "pending"), lte(payouts.createdAt, cutoff)));

    let processed = 0;
    for (const payout of eligiblePayouts) {
      await db.update(payouts).set({ status: "approved", updatedAt: new Date() }).where(eq(payouts.id, payout.id));
      await createNotification({
        userId: payout.sellerId, type: "system", title: "Payout Auto-Approved",
        body: `Your payout request for $${payout.amount} has been automatically approved.`,
        linkedRoute: "/profile/me?tab=wallet",
      });
      processed++;
    }

    const result = { message: `Auto-processed ${processed} payout(s)`, processed };
    if (res) return res.json(result);
    return result;
  } catch (error) {
    console.error("Error processing auto-payouts:", error);
    if (res) res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  requestPayout,
  getMyPayouts,
  getWalletStats,
  adminGetPayouts,
  adminUpdatePayoutStatus,
  getAutoPayoutSettings,
  updateAutoPayoutSettings,
  processAutoPayouts,
};
