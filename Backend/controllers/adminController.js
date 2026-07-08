const db = require("../db");
const { users, products, reports, orders, categories, coupons, flashSales, notifications, messages, conversationParticipants, reviews, refundRequests, featuredListings } = require("../db/schema");
const { eq, ne, or, ilike, and, desc, count, inArray, sql, gte, lte, isNotNull } = require("drizzle-orm");
const { alias } = require("drizzle-orm/pg-core");
const { loadActivePromotions, annotateProducts } = require("../utils/discountEngine");

const buyer = alias(users, "buyer");
const seller = alias(users, "seller");
const reporter = alias(users, "reporter");
const productOwner = alias(users, "productOwner");

const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Core counts ───────────────────────────────────────────────
    const [userCount] = await db.select({ value: count() }).from(users);
    const [productCount] = await db.select({ value: count() }).from(products);
    const [reportCount] = await db.select({ value: count() }).from(reports)
      .where(eq(reports.status, 'pending'));

    // ── Today's revenue & orders ──────────────────────────────────
    const todayOrders = await db.select({ value: count() }).from(orders)
      .where(gte(orders.createdAt, todayStart));
    const todayRevenue = await db.select({ value: sql`COALESCE(SUM(${orders.price}), 0)` }).from(orders)
      .where(and(gte(orders.createdAt, todayStart), ne(orders.status, 'cancelled')));
    const todayPlatformFee = await db.select({ value: sql`COALESCE(SUM(${orders.platformFee}), 0)` }).from(orders)
      .where(and(gte(orders.createdAt, todayStart), ne(orders.status, 'cancelled')));

    // ── New users (7 days) ────────────────────────────────────────
    const [newUsers] = await db.select({ value: count() }).from(users)
      .where(gte(users.createdAt, sevenDaysAgo));

    // ── Pending verifications ─────────────────────────────────────
    const [unverifiedProducts] = await db.select({ value: count() }).from(products)
      .where(eq(products.isVerified, false));
    const [unverifiedUsers] = await db.select({ value: count() }).from(users)
      .where(eq(users.isVerified, false));

    // ── Revenue history (last 30 days, by day) ────────────────────
    const revenueRows = await db.execute(sql`
      SELECT DATE(created_at) AS day, COALESCE(SUM(price), 0) AS gross, COALESCE(SUM(platform_fee), 0) AS fees
      FROM orders
      WHERE created_at >= ${thirtyDaysAgo} AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);
    const revenueMap = {};
    const feeMap = {};
    for (const row of revenueRows.rows || []) {
      const dayStr = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10);
      revenueMap[dayStr] = Number(row.gross);
      feeMap[dayStr] = Number(row.fees);
    }
    const revenueHistory = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      revenueHistory.push({ date: key, gross: revenueMap[key] || 0, platformFees: feeMap[key] || 0, revenue: revenueMap[key] || 0 });
    }

    // ── Recent orders (last 5) ────────────────────────────────────
    const recentOrdersRaw = await db.select({
      id: orders.id,
      price: orders.price,
      status: orders.status,
      createdAt: orders.createdAt,
      productTitle: products.title,
      productThumbnail: sql`(${products.images})[1]`,
      buyerName: users.name,
    })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(users, eq(orders.buyerId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    // ── Top categories by product count ───────────────────────────
    const catCounts = await db.select({
      name: categories.name,
      productCount: count(),
    })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(count()))
      .limit(5);

    const totalCatProducts = catCounts.reduce((sum, c) => sum + Number(c.productCount), 0);
    const topCategories = catCounts.map(c => ({
      name: c.name,
      productCount: Number(c.productCount),
      percentage: totalCatProducts > 0 ? Math.round((Number(c.productCount) / totalCatProducts) * 100) : 0,
    }));

    // ── Flash sale stats ──────────────────────────────────────────
    const [activeFlashSales] = await db.select({ value: count() }).from(flashSales)
      .where(and(eq(flashSales.isActive, true), lte(flashSales.startDate, now), gte(flashSales.endDate, now)));
    const [totalDiscount] = await db.select({ value: sql`COALESCE(SUM(${orders.flashSaleDiscount}), 0)` }).from(orders)
      .where(and(isNotNull(orders.flashSaleDiscount), ne(orders.status, 'cancelled'), sql`${orders.flashSaleDiscount} > 0`));

    // Refund + featured stats (gracefully handle missing tables)
    let pendingRefundsCount = 0;
    let activeFeaturedCount = 0;
    try {
      const [pr] = await db.select({ value: count() }).from(refundRequests)
        .where(eq(refundRequests.status, 'pending'));
      pendingRefundsCount = Number(pr?.value || 0);
    } catch (e) { /* table may not exist */ }
    try {
      const [af] = await db.select({ value: count() }).from(featuredListings)
        .where(and(eq(featuredListings.isActive, true), gte(featuredListings.endDate, now)));
      activeFeaturedCount = Number(af?.value || 0);
    } catch (e) { /* table may not exist */ }

    res.json({
      stats: {
        totalUsers: Number(userCount.value),
        totalProducts: Number(productCount.value),
        openReports: Number(reportCount.value),
        todayRevenue: Number(todayRevenue[0]?.value || 0),
        todayPlatformFee: Number(todayPlatformFee[0]?.value || 0),
        todayOrders: Number(todayOrders[0]?.value || 0),
        newUsers7d: Number(newUsers.value),
        pendingVerifications: Number(unverifiedProducts.value) + Number(unverifiedUsers.value),
      },
      revenueHistory,
      recentOrders: recentOrdersRaw.map(r => ({
        id: r.id,
        productTitle: r.productTitle || '[Deleted]',
        productThumbnail: r.productThumbnail || '',
        price: r.price,
        status: r.status,
        buyerName: r.buyerName || 'Unknown',
        createdAt: r.createdAt,
      })),
      topCategories,
      pendingApprovals: {
        unverifiedProducts: Number(unverifiedProducts.value),
        unverifiedUsers: Number(unverifiedUsers.value),
      },
      flashSaleStats: {
        activeSales: Number(activeFlashSales.value),
        totalDiscountGiven: Number(totalDiscount?.value || 0),
      },
      refundStats: {
        pendingRefunds: pendingRefundsCount,
      },
      featuredStats: {
        activeFeatured: activeFeaturedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getStats = async (req, res) => {
  try {
    const [userCount] = await db.select({ value: count() }).from(users);
    const [adminCount] = await db.select({ value: count() }).from(users).where(eq(users.role, 'admin'));
    const [verifiedCount] = await db.select({ value: count() }).from(users).where(eq(users.isVerified, true));
    const [suspendedCount] = await db.select({ value: count() }).from(users).where(eq(users.isSuspended, true));

    const [productCount] = await db.select({ value: count() }).from(products);
    const [activeProductCount] = await db.select({ value: count() }).from(products).where(eq(products.status, 'active'));
    const [soldProductCount] = await db.select({ value: count() }).from(products).where(eq(products.status, 'sold'));
    const [totalProductViews] = await db.select({ value: sql`COALESCE(SUM(${products.viewCount}), 0)` }).from(products);

    const [reportCount] = await db.select({ value: count() }).from(reports).where(eq(reports.status, 'pending'));
    const [orderCount] = await db.select({ value: count() }).from(orders);

    res.json({
      totalUsers: Number(userCount.value),
      totalAdmins: Number(adminCount.value),
      totalVerified: Number(verifiedCount.value),
      totalSuspended: Number(suspendedCount.value),
      totalProducts: Number(productCount.value),
      activeProducts: Number(activeProductCount.value),
      soldProducts: Number(soldProductCount.value),
      totalProductViews: Number(totalProductViews.value),
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
    const role = req.query.role || "";
    const status = req.query.status || "";
    const verified = req.query.verified || "";
    const skip = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      ));
    }
    if (role && role !== 'all') {
      conditions.push(eq(users.role, role));
    }
    if (status && status !== 'all') {
      if (status === 'suspended') {
        conditions.push(eq(users.isSuspended, true));
      } else if (status === 'active') {
        conditions.push(eq(users.isSuspended, false));
      }
    }
    if (verified === 'true') {
      conditions.push(eq(users.isVerified, true));
    }

    const whereConditions = conditions.length > 0 ? and(...conditions) : undefined;

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

    // 1. Delete notifications related to the user
    await db.delete(notifications).where(eq(notifications.userId, id));

    // 2. Delete messages sent by user
    await db.delete(messages).where(eq(messages.senderId, id));

    // 3. Delete conversation participants
    await db.delete(conversationParticipants).where(eq(conversationParticipants.userId, id));

    // 4. Delete reviews written by or about the user
    await db.delete(reviews).where(or(eq(reviews.reviewerId, id), eq(reviews.revieweeId, id)));

    // 5. Find all products owned by the user
    const userProducts = await db.select({ id: products.id }).from(products).where(eq(products.userId, id));
    const productIds = userProducts.map(p => p.id);

    if (productIds.length > 0) {
      // Delete orders referencing user's products
      await db.delete(orders).where(inArray(orders.productId, productIds));
      // Delete reviews referencing user's products
      await db.delete(reviews).where(inArray(reviews.productId, productIds));
      // Delete products
      await db.delete(products).where(inArray(products.id, productIds));
    }

    // 6. Delete orders where user is buyer or seller
    await db.delete(orders).where(or(eq(orders.buyerId, id), eq(orders.sellerId, id)));

    // 7. Finally delete the user
    const [deletedUser] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User and all their listings/transactions deleted successfully" });
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
    const search = req.query.search || "";
    const verified = req.query.verified;
    const skip = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(products.status, status));
    if (verified === 'true') conditions.push(eq(products.isVerified, true));
    if (verified === 'false') conditions.push(eq(products.isVerified, false));
    if (search) {
      conditions.push(or(
        ilike(products.title, `%${search}%`),
        ilike(products.description, `%${search}%`)
      ));
    }

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

    // Apply active promotions (flash sales + category sales)
    const promotions = await loadActivePromotions();
    const discounted = annotateProducts(formatted, promotions);

    res.json({
      products: discounted,
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

    // Mark associated reports as resolved before deleting the product
    await db.update(reports)
      .set({ status: 'resolved', updatedAt: new Date() })
      .where(eq(reports.productId, id));

    const [product] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

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

    // All-time totals (ignoring pagination)
    const totalsWhere = status ? and(ne(orders.status, 'cancelled'), eq(orders.status, status)) : ne(orders.status, 'cancelled');
    const [totalRevenueResult] = await db.select({ value: sql`COALESCE(SUM(${orders.price}), 0)` }).from(orders).where(totalsWhere);
    const [totalFeesResult] = await db.select({ value: sql`COALESCE(SUM(${orders.platformFee}), 0)` }).from(orders).where(totalsWhere);

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
      totalPrice: (r.orders.price || 0) + (r.orders.platformFee || 0),
      productId: r.products ? { id: r.products.id, title: r.products.title, thumbnail: (r.products.images || [])[0] || '', price: r.products.price } : null,
      buyerId: r.buyer ? { id: r.buyer.id, name: r.buyer.name, email: r.buyer.email } : null,
      sellerId: r.seller ? { id: r.seller.id, name: r.seller.name, email: r.seller.email } : null,
    }));

    res.json({
      orders: formatted,
      total,
      page,
      pages: Math.ceil(total / limit),
      totals: {
        grossRevenue: Number(totalRevenueResult?.value || 0),
        platformFees: Number(totalFeesResult?.value || 0),
      },
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

const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const [report] = await db.update(reports)
      .set({ status: 'resolved', updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning({ id: reports.id });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.json({ message: "Report resolved successfully" });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value. Must be one of: " + validStatuses.join(', ') });
    }

    const [order] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getCoupons = async (req, res) => {
  try {
    const result = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(result);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const createCoupon = async (req, res) => {
  try {
    let { code, discountType, discountValue, expiryDate, maxUses, maxPerUser } = req.body;
    if (!code || !discountValue) {
      return res.status(400).json({ message: "Coupon code and discount value are required" });
    }
    
    code = code.trim().toUpperCase();
    
    // Check uniqueness
    const [existing] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    
    const validTypes = ["percentage", "fixed"];
    if (discountType && !validTypes.includes(discountType)) {
      return res.status(400).json({ message: "Invalid discount type. Must be 'percentage' or 'fixed'" });
    }
    
    const [coupon] = await db.insert(coupons).values({
      code,
      discountType: discountType || "percentage",
      discountValue: parseFloat(discountValue),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      maxPerUser: maxPerUser ? parseInt(maxPerUser) : null,
      usedCount: 0,
      isActive: true
    }).returning();
    
    res.json(coupon);
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const patchCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountType, discountValue, expiryDate, isActive, maxUses, maxPerUser } = req.body;
    
    const updateData = { updatedAt: new Date() };
    if (isActive !== undefined) updateData.isActive = isActive;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = parseFloat(discountValue);
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (maxUses !== undefined) updateData.maxUses = parseInt(maxUses);
    if (maxPerUser !== undefined) updateData.maxPerUser = parseInt(maxPerUser);
    
    const [coupon] = await db.update(coupons)
      .set(updateData)
      .where(eq(coupons.id, id))
      .returning();
      
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    
    res.json(coupon);
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const [coupon] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted successfully", coupon });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getDashboard,
  getStats,
  getUsers,
  patchUser,
  deleteUser,
  getAllProducts,
  patchProduct,
  deleteAnyProduct,
  getReports,
  resolveReport,
  deleteReport,
  getAllOrders,
  updateOrderStatus,
  getCoupons,
  createCoupon,
  patchCoupon,
  deleteCoupon,
};
