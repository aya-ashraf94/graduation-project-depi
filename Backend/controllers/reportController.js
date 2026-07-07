const db = require("../db");
const { reports, products, users } = require("../db/schema");
const { createNotification } = require("../utils/notifications");
const { eq, and } = require("drizzle-orm");

const createReport = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { productId, reason, details } = req.body;

    if (!productId || !reason) {
      return res.status(400).json({ message: "Product ID and reason are required" });
    }

    // Duplicate check: prevent same user from reporting the same product twice while pending
    const [existing] = await db.select({ id: reports.id })
      .from(reports)
      .where(and(
        eq(reports.productId, productId),
        eq(reports.reporterId, reporterId),
        eq(reports.status, 'pending')
      ))
      .limit(1);

    if (existing) {
      return res.status(409).json({ message: "You have already reported this listing. Our team will review it shortly." });
    }

    const [report] = await db.insert(reports).values({
      productId,
      reporterId,
      reason,
      details: details || null,
    }).returning();

    // Notify the seller that their listing was reported
    const [product] = await db.select({ userId: products.userId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product) {
      await createNotification({
        userId: product.userId, type: 'system', title: 'Listing Reported',
        body: `Your listing has been reported for: ${reason}. Our moderation team will review it.`,
        linkedRoute: `/products/${productId}`, linkedEntityId: productId,
      });
    }

    res.status(201).json({ message: "Report submitted successfully", report });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createReport,
};
