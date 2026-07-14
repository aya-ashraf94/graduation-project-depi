const db = require("../db");
const { reviews, orders, users, products } = require("../db/schema");
const { createNotification } = require("../utils/notifications");
const { eq, and, desc, sql } = require("drizzle-orm");
const { alias } = require("drizzle-orm/pg-core");

const reviewer = alias(users, "reviewer");
const reviewee = alias(users, "reviewee");

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

    if (order.status !== "delivered") {
      return res.status(400).json({ message: "You can only review delivered orders" });
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

    const [reviewerName] = await db.select({ name: users.name }).from(users).where(eq(users.id, reviewerId)).limit(1);
    await createNotification({
      userId: revieweeId, type: "review", title: "New Review Received",
      body: `${reviewerName?.name || "A user"} left you a ${rating}-star review.`,
      linkedRoute: "/profile/me?tab=reviews", linkedEntityId: review.id,
    });

    const [stats] = await db.select({
      avg: sql`AVG(${reviews.rating})`,
      count: sql`COUNT(*)`,
    }).from(reviews)
      .where(eq(reviews.revieweeId, revieweeId));
    const averageRating = Number(stats.count) > 0 ? Math.round(Number(stats.avg) * 10) / 10 : 5.0;

    await db.update(users).set({
      rating: averageRating,
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
      .leftJoin(reviewer, eq(reviews.reviewerId, reviewer.id))
      .leftJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt));

    const formatted = result.map(r => ({
      ...r.reviews,
      orderId: r.reviews.orderId,
      reviewerId: r.reviewer ? { id: r.reviewer.id, name: r.reviewer.name, email: r.reviewer.email, avatar: r.reviewer.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' } : null,
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
      .leftJoin(reviewee, eq(reviews.revieweeId, reviewee.id))
      .leftJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt));

    const formatted = result.map(r => ({
      ...r.reviews,
      orderId: r.reviews.orderId,
      revieweeId: r.reviewee ? { id: r.reviewee.id, name: r.reviewee.name, email: r.reviewee.email, avatar: r.reviewee.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' } : null,
      productId: r.products ? { id: r.products.id, title: r.products.title, price: r.products.price, thumbnail: (r.products.images || [])[0] } : null,
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
