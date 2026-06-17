const db = require("../db");
const { users, products, userWishlist } = require("../db/schema");
const { eq, inArray, and, sql } = require("drizzle-orm");

const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [existing] = await db.select()
      .from(userWishlist)
      .where(and(eq(userWishlist.userId, userId), eq(userWishlist.productId, productId)))
      .limit(1);

    let added;
    if (existing) {
      await db.delete(userWishlist)
        .where(and(eq(userWishlist.userId, userId), eq(userWishlist.productId, productId)));
      added = false;
    } else {
      await db.insert(userWishlist).values({ userId, productId });
      added = true;
    }

    const wishlistRows = await db.select({ productId: userWishlist.productId })
      .from(userWishlist)
      .where(eq(userWishlist.userId, userId));

    const wishlist = wishlistRows.map(r => r.productId);

    res.json({
      message: added ? "Product added to wishlist" : "Product removed from wishlist",
      added,
      wishlist,
    });
  } catch (error) {
    console.error("Error toggling wishlist:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getWishlistIds = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.select({ productId: userWishlist.productId })
      .from(userWishlist)
      .where(eq(userWishlist.userId, userId));

    res.json(rows.map(r => r.productId));
  } catch (error) {
    console.error("Error fetching wishlist IDs:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getWishlistProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.select({ productId: userWishlist.productId })
      .from(userWishlist)
      .where(eq(userWishlist.userId, userId));

    const productIds = rows.map(r => r.productId);

    if (productIds.length === 0) {
      return res.json([]);
    }

    const result = await db.select()
      .from(products)
      .where(inArray(products.id, productIds))
      .leftJoin(users, eq(products.userId, users.id));

    const formattedProducts = result.map(r => ({
      id: r.products.id,
      title: r.products.title,
      price: r.products.price,
      images: r.products.images,
      thumbnail: (r.products.images || [])[0] || '',
      brand: r.products.dynamicAttributes?.brand || '',
      condition: r.products.dynamicAttributes?.condition || '',
      status: r.products.status,
      location: r.products.location || '',
      seller: r.users ? {
        id: r.users.id,
        name: r.users.name,
        avatar: r.users.avatar,
        isVerified: r.users.isVerified,
      } : null,
      sellerId: r.products.userId,
      viewCount: r.products.viewCount,
      createdAt: r.products.createdAt,
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error("Error fetching wishlist products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  toggleWishlist,
  getWishlistIds,
  getWishlistProducts,
};
