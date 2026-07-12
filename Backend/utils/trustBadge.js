const db = require("../db");
const { users, orders, reviews } = require("../db/schema");
const { eq, avg, count, sql, inArray } = require("drizzle-orm");

const BADGE_LABEL = 'Trusted Seller';

async function computeAndSaveTrustBadge(sellerId) {
  const badge = await computeTrustBadge(sellerId);
  try {
    await db.update(users)
      .set({ trustBadge: badge.hasBadge ? BADGE_LABEL : null })
      .where(eq(users.id, sellerId));
  } catch (e) {
    console.error("Failed to save trust badge for", sellerId, e.message);
  }
  return badge;
}

async function computeTrustBadge(sellerId) {
  try {
    const [ratingResult] = await db.select({ value: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.revieweeId, sellerId));

    const avgRating = ratingResult?.value ? parseFloat(ratingResult.value) : 0;

    const [orderStats] = await db.select({
      totalOrders: count(),
      completedOrders: sql`COUNT(CASE WHEN status = 'delivered' THEN 1 END)`,
    })
      .from(orders)
      .where(eq(orders.sellerId, sellerId));

    const totalOrders = parseInt(orderStats?.totalOrders || '0');
    const completedOrders = parseInt(orderStats?.completedOrders || '0');

    const orderSuccessRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100;
    const totalSales = completedOrders;

    const hasBadge = avgRating >= 4.5 && orderSuccessRate >= 95 && totalSales >= 10;

    return { hasBadge, label: hasBadge ? BADGE_LABEL : null, avgRating, orderSuccessRate, totalSales };
  } catch (error) {
    console.error("Error computing trust badge:", error);
    return { hasBadge: false, label: null, avgRating: 0, orderSuccessRate: 100, totalSales: 0 };
  }
}

async function refreshTrustBadges() {
  try {
    const sellerRows = await db.select({ id: users.id })
      .from(users)
      .where(sql`EXISTS (SELECT 1 FROM ${orders} WHERE ${orders.sellerId} = ${users.id})`);

    for (const seller of sellerRows) {
      await computeAndSaveTrustBadge(seller.id);
    }
    console.log(`Refreshed trust badges for ${sellerRows.length} sellers`);
  } catch (error) {
    console.error("Error refreshing trust badges:", error);
  }
}

module.exports = { computeTrustBadge, computeAndSaveTrustBadge, refreshTrustBadges, BADGE_LABEL };
