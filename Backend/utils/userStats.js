const User = require("../models/User");
const Order = require("../models/Order");

/**
 * Dynamically counts orders to update a user's totalSales, totalPurchases, and successRate.
 * - totalSales: Count of 'delivered' orders where the user is the seller.
 * - totalPurchases: Count of 'delivered' orders where the user is the buyer.
 * - successRate: Ratio of delivered sales to total non-pending/non-shipped seller transactions.
 *                Formally: delivered / (delivered + cancelled) * 100.
 */
const updateUserStats = async (userId) => {
    try {
        if (!userId) return;

        // Count ONLY 'delivered' orders for successful stats
        const totalSales = await Order.countDocuments({ sellerId: userId, status: "delivered" });
        const totalPurchases = await Order.countDocuments({ buyerId: userId, status: "delivered" });
        
        // Count cancelled sales for success rate
        const cancelledSales = await Order.countDocuments({ sellerId: userId, status: "cancelled" });
        
        let successRate = 100;
        const totalSellerOrders = totalSales + cancelledSales;
        if (totalSellerOrders > 0) {
            successRate = Math.round((totalSales / totalSellerOrders) * 100);
        }

        await User.findByIdAndUpdate(userId, { 
            totalSales, 
            totalPurchases, 
            successRate 
        });
    } catch (error) {
        console.error(`Error updating stats for user ${userId}:`, error);
    }
};

module.exports = { updateUserStats };
