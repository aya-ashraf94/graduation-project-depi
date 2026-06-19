const db = require("../db");
const { offers, products, notifications } = require("../db/schema");
const { eq, and, desc } = require("drizzle-orm");

const makeOffer = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { productId, amount } = req.body;

    if (!productId || !amount) {
      return res.status(400).json({ message: "Product ID and amount are required" });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.userId === buyerId) {
      return res.status(400).json({ message: "You cannot make an offer on your own product" });
    }

    const [newOffer] = await db.insert(offers).values({
      productId,
      buyerId,
      sellerId: product.userId,
      amount: Number(amount),
    }).returning();

    // Trigger offer notification to seller
    try {
      await db.insert(notifications).values({
        userId: product.userId,
        type: "order_update",
        title: "New Offer Received 💸",
        body: `You received an offer of $${amount} on "${product.title}"`,
        linkedEntityId: newOffer.id,
        linkedRoute: `/profile/me?tab=offers`,
        isRead: false,
      });
    } catch (notifError) {
      console.error("Failed to trigger offer notification:", notifError);
    }

    res.status(201).json({
      message: "Offer submitted successfully",
      offer: newOffer,
    });
  } catch (error) {
    console.error("Error making offer:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getOffers = async (req, res) => {
  try {
    const userId = req.user.id;
    // Get all offers where the user is buyer or seller
    const result = await db.select()
      .from(offers)
      .where(and(eq(offers.buyerId, userId)))
      .orderBy(desc(offers.createdAt));

    res.json(result);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  makeOffer,
  getOffers,
};
