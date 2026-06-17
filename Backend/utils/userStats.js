const db = require("../db");
const { users, orders } = require("../db/schema");
const { eq, and, count } = require("drizzle-orm");

const updateUserStats = async (userId) => {
  try {
    if (!userId) return;

    const [salesResult] = await db.select({ value: count() })
      .from(orders)
      .where(and(eq(orders.sellerId, userId), eq(orders.status, "delivered")));

    const [purchasesResult] = await db.select({ value: count() })
      .from(orders)
      .where(and(eq(orders.buyerId, userId), eq(orders.status, "delivered")));

    const [cancelledResult] = await db.select({ value: count() })
      .from(orders)
      .where(and(eq(orders.sellerId, userId), eq(orders.status, "cancelled")));

    const totalSales = Number(salesResult.value);
    const totalPurchases = Number(purchasesResult.value);
    const cancelledSales = Number(cancelledResult.value);

    let successRate = 100;
    const totalSellerOrders = totalSales + cancelledSales;
    if (totalSellerOrders > 0) {
      successRate = Math.round((totalSales / totalSellerOrders) * 100);
    }

    await db.update(users).set({
      totalSales,
      totalPurchases,
      successRate,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  } catch (error) {
    console.error(`Error updating stats for user ${userId}:`, error);
  }
};

module.exports = { updateUserStats };
