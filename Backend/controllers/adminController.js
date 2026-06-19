const db = require("../db");
const { users, products, reports, orders, categories } = require("../db/schema");
const { eq, or, ilike, and, desc, count, inArray, sql } = require("drizzle-orm");
const { alias } = require("drizzle-orm/pg-core");

const buyer = alias(users, "buyer");
const seller = alias(users, "seller");
const reporter = alias(users, "reporter");
const productOwner = alias(users, "productOwner");

const getStats = async (req, res) => {
  try {
    const [userCount] = await db.select({ value: count() }).from(users);
    const [productCount] = await db.select({ value: count() }).from(products);
    const [reportCount] = await db.select({ value: count() }).from(reports);
    const [orderCount] = await db.select({ value: count() }).from(orders);

    res.json({
      totalUsers: Number(userCount.value),
      totalProducts: Number(productCount.value),
      openReports: Number(reportCount.value),
      totalOrders: Number(orderCount.value),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let whereConditions = undefined;
    if (search) {
      whereConditions = or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      );
    }

    const [totalResult] = await db.select({ value: count() }).from(users)
      .where(whereConditions);

    const total = Number(totalResult.value);

    const result = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isVerified: users.isVerified,
      isSuspended: users.isSuspended,
      avatar: users.avatar,
      rating: users.rating,
      totalSales: users.totalSales,
      totalPurchases: users.totalPurchases,
      createdAt: users.createdAt,
    })
      .from(users)
      .where(whereConditions)
      .orderBy(desc(users.createdAt))
      .offset(skip)
      .limit(limit);

    res.json({
      users: result,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const patchUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, role, isSuspended } = req.body;

    const updateData = { updatedAt: new Date() };
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (role !== undefined) updateData.role = role;
    if (isSuspended !== undefined) updateData.isSuspended = isSuspended;

    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerified: users.isVerified,
        isSuspended: users.isSuspended,
        avatar: users.avatar,
        createdAt: users.createdAt,
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const [user] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.delete(products).where(eq(products.userId, id));

    res.json({ message: "User and their listings deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const categoryName = req.query.category;
    const skip = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(products.status, status));

    if (categoryName) {
      const matchCats = await db.select().from(categories)
        .where(ilike(categories.name, `%${categoryName}%`));
      const catIds = matchCats.map(c => c.id);
      if (catIds.length > 0) {
        conditions.push(inArray(products.categoryId, catIds));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ value: count() }).from(products).where(whereClause);
    const total = Number(totalResult.value);

    const result = await db.select()
      .from(products)
      .where(whereClause)
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt))
      .offset(skip)
      .limit(limit);

    const formatted = result.map(r => ({
      ...r.products,
      userId: r.users ? { id: r.users.id, name: r.users.name, email: r.users.email, avatar: r.users.avatar } : null,
      categoryId: r.categories ? { id: r.categories.id, name: r.categories.name } : null,
    }));

    res.json({
      products: formatted,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const patchProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, status } = req.body;

    const updateData = { updatedAt: new Date() };
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (status !== undefined) updateData.status = status;

    const [product] = await db.update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const result = await db.select()
      .from(products)
      .where(eq(products.id, id))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .limit(1);

    const row = result[0];
    const data = {
      ...row.products,
      userId: row.users ? { id: row.users.id, name: row.users.name, email: row.users.email, avatar: row.users.avatar } : null,
      categoryId: row.categories ? { id: row.categories.id, name: row.categories.name } : null,
    };

    res.json(data);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteAnyProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await db.delete(reports).where(eq(reports.productId, id));

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getReports = async (req, res) => {
  try {
    const result = await db.select()
      .from(reports)
      .where(eq(reports.status, 'pending'))
      .leftJoin(products, eq(reports.productId, products.id))
      .leftJoin(reporter, eq(reports.reporterId, reporter.id))
      .leftJoin(productOwner, eq(products.userId, productOwner.id))
      .orderBy(desc(reports.createdAt));

    const formatted = result.map(r => ({
      ...r.reports,
      productId: r.products ? {
        ...r.products,
        userId: r.productOwner ? { id: r.productOwner.id, name: r.productOwner.name, email: r.productOwner.email } : null,
      } : null,
      reporterId: r.reporter ? { id: r.reporter.id, name: r.reporter.name, email: r.reporter.email } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const whereClause = status ? eq(orders.status, status) : undefined;

    const [totalResult] = await db.select({ value: count() }).from(orders).where(whereClause);
    const total = Number(totalResult.value);

    const result = await db.select()
      .from(orders)
      .where(whereClause)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(buyer, eq(orders.buyerId, buyer.id))
      .leftJoin(seller, eq(orders.sellerId, seller.id))
      .orderBy(desc(orders.createdAt))
      .offset(skip)
      .limit(limit);

    const formatted = result.map(r => ({
      ...r.orders,
      productId: r.products ? { id: r.products.id, title: r.products.title, thumbnail: (r.products.images || [])[0] || '', price: r.products.price } : null,
      buyerId: r.buyer ? { id: r.buyer.id, name: r.buyer.name, email: r.buyer.email } : null,
      sellerId: r.seller ? { id: r.seller.id, name: r.seller.name, email: r.seller.email } : null,
    }));

    res.json({
      orders: formatted,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const [report] = await db.update(reports)
      .set({ status: 'dismissed', updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning({ id: reports.id });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.json({ message: "Report dismissed successfully" });
  } catch (error) {
    console.error("Error dismissing report:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getStats,
  getUsers,
  patchUser,
  deleteUser,
  getAllProducts,
  patchProduct,
  deleteAnyProduct,
  getReports,
  deleteReport,
  getAllOrders,
};
