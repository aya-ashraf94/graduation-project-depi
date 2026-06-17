const db = require("../db");
const { reviews, orders, users, notifications, products } = require("../db/schema");
const { eq, and, desc, sql } = require("drizzle-orm");

const createReview = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating || !comment) {
      return res.status(400).json({ message: "Please provide orderId, rating, and comment" });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (reviewerId !== order.buyerId && reviewerId !== order.sellerId) {
      return res.status(403).json({ message: "You are not involved in this transaction" });
    }

    const productId = order.productId;
    const revieweeId = (reviewerId === order.buyerId) ? order.sellerId : order.buyerId;

    const [existing] = await db.select()
      .from(reviews)
      .where(and(eq(reviews.orderId, orderId), eq(reviews.reviewerId, reviewerId)))
      .limit(1);

    if (existing) {
      return res.status(400).json({ message: "You have already reviewed this transaction" });
    }

    const [review] = await db.insert(reviews).values({
      orderId,
      reviewerId,
      revieweeId,
      productId,
      rating: numRating,
      comment,
    }).returning();

    try {
      const [reviewer] = await db.select({ name: users.name }).from(users).where(eq(users.id, reviewerId)).limit(1);
      const reviewerName = reviewer ? reviewer.name : "A user";
      await db.insert(notifications).values({
        userId: revieweeId,
        type: "review",
        title: "New Review Received",
        body: `${reviewerName} left you a ${rating}-star review.`,
        linkedEntityId: review.id,
        linkedRoute: "/profile/me?tab=reviews",
      });
    } catch (notifErr) {
      console.error("Error triggering review notification:", notifErr);
    }

    const allReviews = await db.select({ rating: reviews.rating })
      .from(reviews)
      .where(eq(reviews.revieweeId, revieweeId));

    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = allReviews.length > 0 ? (sum / allReviews.length) : 5.0;
    const roundedRating = Math.round(averageRating * 10) / 10;

    await db.update(users).set({
      rating: roundedRating,
      updatedAt: new Date(),
    }).where(eq(users.id, revieweeId));

    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getReviewsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.select()
      .from(reviews)
      .where(eq(reviews.revieweeId, userId))
      .leftJoin(users.as("reviewer"), eq(reviews.reviewerId, users.as("reviewer").id))
      .leftJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt));

    const formatted = result.map(r => ({
      ...r.reviews,
      reviewerId: r.reviewer ? { id: r.reviewer.id, name: r.reviewer.name, email: r.reviewer.email, avatar: r.reviewer.avatar } : null,
      productId: r.products ? { id: r.products.id, title: r.products.title, price: r.products.price, thumbnail: (r.products.images || [])[0] } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching reviews for user:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.select()
      .from(reviews)
      .where(eq(reviews.reviewerId, userId))
      .leftJoin(users.as("reviewee"), eq(reviews.revieweeId, users.as("reviewee").id))
      .orderBy(desc(reviews.createdAt));

    const formatted = result.map(r => ({
      ...r.reviews,
      revieweeId: r.reviewee ? { id: r.reviewee.id, name: r.reviewee.name, email: r.reviewee.email, avatar: r.reviewee.avatar } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching reviews written by user:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createReview,
  getReviewsForUser,
  getReviewsByUser,
};
