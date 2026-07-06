const db = require("../db");
const { products, categories, users, userBlocks } = require("../db/schema");
const { eq, ilike, or, and, ne, gte, lte, inArray, notInArray, desc, asc, sql, count } = require("drizzle-orm");
const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");
const jwt = require("jsonwebtoken");
const { loadActivePromotions, annotateProduct, annotateProducts } = require("../utils/discountEngine");

const isCloudinaryConfigured = () => {
  return process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET;
};

const saveBase64ImageLocally = (base64Str) => {
  if (!base64Str) return null;
  if (base64Str.startsWith("http") || base64Str.startsWith("/uploads")) return base64Str;
  
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 image format");
  }

  const mimeType = matches[1].toLowerCase();
  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error("Disallowed file type: " + mimeType);
  }

  let extension = mimeType.split("/")[1];
  if (extension === "svg+xml") {
    extension = "svg";
  }

  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
  const uploadDir = path.join(__dirname, "../public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, fileName), buffer);
  return `/uploads/${fileName}`;
};

const uploadBase64ToCloudinary = async (base64Str) => {
  if (!base64Str) return null;
  if (base64Str.startsWith("http")) return base64Str;
  if (!isCloudinaryConfigured()) return saveBase64ImageLocally(base64Str);
  const result = await cloudinary.uploader.upload(base64Str, { folder: "nafa3ni-products" });
  return result.secure_url;
};

const getProductById = async (req, res) => {
  try {
    const [product] = await db.update(products)
      .set({ viewCount: sql`${products.viewCount} + 1`, updatedAt: new Date() })
      .where(eq(products.id, req.params.id))
      .returning();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Extract token optionally to get logged in user ID
    let currentUserId = null;
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      token = req.cookies?.nafa3ni_token;
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (err) {
        // ignore
      }
    }

    if (product && currentUserId) {
      const [blockRelation] = await db.select()
        .from(userBlocks)
        .where(
          or(
            and(eq(userBlocks.blockerId, currentUserId), eq(userBlocks.blockedId, product.userId)),
            and(eq(userBlocks.blockerId, product.userId), eq(userBlocks.blockedId, currentUserId))
          )
        )
        .limit(1);
      if (blockRelation) {
        return res.status(404).json({ message: "Product not found" });
      }
    }

    const result = await db.select()
      .from(products)
      .where(eq(products.id, req.params.id))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const row = result[0];
    const data = {
      ...row.products,
      userId: row.users,
      categoryId: row.categories,
    };

    // Apply active promotions (flash sales + category sales)
    const promotions = await loadActivePromotions();
    const discounted = annotateProduct(data, promotions);

    res.json(discounted);
  } catch (error) {
    console.error("Error in getProductById:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getProducts = async (req, res) => {
  try {
    // Extract token optionally to get logged in user ID
    let currentUserId = null;
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      token = req.cookies?.nafa3ni_token;
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (err) {
        // ignore
      }
    }

    let blockedUserIds = [];
    if (currentUserId) {
      const blocks = await db.select()
        .from(userBlocks)
        .where(
          or(
            eq(userBlocks.blockerId, currentUserId),
            eq(userBlocks.blockedId, currentUserId)
          )
        );
      blockedUserIds = blocks.map(b => b.blockerId === currentUserId ? b.blockedId : b.blockerId);
    }

    const conditions = [
      ne(products.status, 'sold'),
      ne(products.status, 'draft'),
      ne(products.status, 'reserved')
    ];

    if (blockedUserIds.length > 0) {
      conditions.push(notInArray(products.userId, blockedUserIds));
    }

    if (req.query.category) {
      const catQuery = req.query.category.trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (uuidRegex.test(catQuery)) {
        conditions.push(eq(products.categoryId, catQuery));
      } else {
        const catLower = catQuery.toLowerCase();
        let matchingIds = [];

        if (['tops', 'electronics', 'furniture', 'sports', 'books'].includes(catLower)) {
          const regexMap = {
            tops: /clothes|apparel/i,
            electronics: /laptop|mobile|electronics/i,
            furniture: /appliance|furniture/i,
            sports: /sport/i,
            books: /book/i,
          };
          const regex = regexMap[catLower];
          const allCats = await db.select().from(categories);
          matchingIds = allCats.filter(c => regex.test(c.name)).map(c => c.id);
        } else if (catLower === 'other') {
          const allCats = await db.select().from(categories);
          const excluded = /clothes|apparel|laptop|mobile|electronics|appliance|furniture|sport|book/i;
          matchingIds = allCats.filter(c => !excluded.test(c.name)).map(c => c.id);
        } else {
          const matchCats = await db.select().from(categories)
            .where(ilike(categories.name, `%${catQuery}%`));
          matchingIds = matchCats.map(c => c.id);
        }

        if (matchingIds.length > 0) {
          conditions.push(inArray(products.categoryId, matchingIds));
        }
      }
    }

    if (req.query.condition) {
      const cond = req.query.condition.toLowerCase();
      if (cond === 'new_with_tags' || cond === 'new') {
        conditions.push(
          or(
            sql`${products.dynamicAttributes}->>'condition' ~* '^new(_with_tags)?$'`,
            sql`${products.dynamicAttributes}->>'Condition' ~* '^new(_with_tags)?$'`
          )
        );
      } else if (cond === 'good' || cond === 'used') {
        conditions.push(
          or(
            sql`${products.dynamicAttributes}->>'condition' ~* '^used|good$'`,
            sql`${products.dynamicAttributes}->>'Condition' ~* '^used|good$'`
          )
        );
      } else {
        conditions.push(
          or(
            sql`${products.dynamicAttributes}->>'condition' ILIKE ${cond}`,
            sql`${products.dynamicAttributes}->>'Condition' ILIKE ${cond}`
          )
        );
      }
    }

    if (req.query.search) {
      const search = `%${req.query.search}%`;
      conditions.push(
        or(
          ilike(products.title, search),
          ilike(products.description, search),
          ilike(products.location, search),
          sql`${products.dynamicAttributes}->>'brand' ILIKE ${search}`,
          sql`${products.dynamicAttributes}->>'Brand' ILIKE ${search}`,
          sql`${products.dynamicAttributes}->>'size' ILIKE ${search}`,
          sql`${products.dynamicAttributes}->>'Size' ILIKE ${search}`
        )
      );
    }

    if (req.query.minPrice || req.query.maxPrice) {
      if (req.query.minPrice) {
        conditions.push(gte(products.price, Number(req.query.minPrice)));
      }
      if (req.query.maxPrice) {
        conditions.push(lte(products.price, Number(req.query.maxPrice)));
      }
    }

    let orderBy = desc(products.createdAt);
    if (req.query.sortBy) {
      const sortMap = {
        price_asc: asc(products.price),
        price_desc: desc(products.price),
        popular: desc(products.viewCount),
        newest: desc(products.createdAt),
      };
      if (sortMap[req.query.sortBy]) orderBy = sortMap[req.query.sortBy];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [totalCountRow] = await db.select({ value: count() })
      .from(products)
      .where(and(...conditions));
    
    const total = Number(totalCountRow.value);

    const result = await db.select()
      .from(products)
      .where(and(...conditions))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(orderBy)
      .offset(skip)
      .limit(limit);

    const formatted = result.map(r => ({
      ...r.products,
      userId: r.users,
      categoryId: r.categories,
    }));

    // Apply active promotions (flash sales + category sales)
    const promotions = await loadActivePromotions();
    const discounted = annotateProducts(formatted, promotions);

    res.json({
      products: discounted,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error in getProducts:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMyProducts = async (req, res) => {
  try {
    const result = await db.select()
      .from(products)
      .where(eq(products.userId, req.user.id))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const formatted = result.map(r => ({
      ...r.products,
      userId: r.users,
      categoryId: r.categories,
    }));

    // Apply active promotions (flash sales + category sales)
    const promotions = await loadActivePromotions();
    const discounted = annotateProducts(formatted, promotions);

    res.json(discounted);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getUserProducts = async (req, res) => {
  try {
    let isOwner = false;
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      token = req.cookies?.nafa3ni_token;
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id === req.params.userId) {
          isOwner = true;
        }
      } catch (err) {
        // Token invalid or expired, ignore
      }
    }

    const conditions = [eq(products.userId, req.params.userId)];
    if (!isOwner) {
      conditions.push(ne(products.status, 'draft'));
    }

    const result = await db.select()
      .from(products)
      .where(and(...conditions))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const formatted = result.map(r => ({
      ...r.products,
      userId: r.users,
      categoryId: r.categories,
    }));

    // Apply active promotions (flash sales + category sales)
    const promotions = await loadActivePromotions();
    const discounted = annotateProducts(formatted, promotions);

    res.json(discounted);
  } catch (error) {
    console.error("Error in getUserProducts:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const createProduct = async (req, res) => {
  try {
    const { title, description, price, minPrice, categoryId, dynamicAttributes, images, showContactInfo } = req.body;

    if (!title || !price || !categoryId) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Check if user has completed profile (has phone number and location data)
    const [seller] = await db.select({
      phoneNumber: users.phoneNumber,
      governorate: users.governorate,
      city: users.city,
      district: users.district,
    }).from(users).where(eq(users.id, req.user.id)).limit(1);

    if (!seller || !seller.phoneNumber || !seller.governorate) {
      return res.status(400).json({
        message: "Please complete your profile before listing a product.",
        needsProfileCompletion: true,
      });
    }

    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      const parsedMinPrice = Number(minPrice);
      if (isNaN(parsedMinPrice) || parsedMinPrice < 0) {
        return res.status(400).json({ message: "Minimum price must be a valid positive number" });
      }
      if (parsedMinPrice > Number(price)) {
        return res.status(400).json({ message: "Minimum price cannot be greater than listing price" });
      }
    }

    const uploadPromises = (images || []).map(async (img) => {
      return uploadBase64ToCloudinary(img);
    });
    const uploadedResults = await Promise.all(uploadPromises);
    const savedImages = uploadedResults.filter(Boolean);

    const [product] = await db.insert(products).values({
      title,
      description: description || null,
      price: Number(price),
      minPrice: minPrice !== undefined && minPrice !== null && minPrice !== '' ? Number(minPrice) : null,
      categoryId,
      dynamicAttributes: dynamicAttributes || {},
      images: savedImages,
      showContactInfo: showContactInfo ?? true,
      userId: req.user.id,
      soldByNafa3ni: req.user.role === 'admin',
      status: req.body.status || 'active',
    }).returning();

    const result = await db.select()
      .from(products)
      .where(eq(products.id, product.id))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .limit(1);

    const row = result[0];
    res.status(201).json({
      message: "Product Created Successfully",
      product: { ...row.products, userId: row.users, categoryId: row.categories },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const [existing] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newPrice = req.body.price !== undefined ? Number(req.body.price) : Number(existing.price);
    const newMinPrice = req.body.minPrice !== undefined && req.body.minPrice !== null && req.body.minPrice !== ''
      ? Number(req.body.minPrice)
      : (req.body.minPrice === null || req.body.minPrice === '' ? null : existing.minPrice);

    if (newMinPrice !== null && newMinPrice !== undefined) {
      if (isNaN(newMinPrice) || newMinPrice < 0) {
        return res.status(400).json({ message: "Minimum price must be a valid positive number" });
      }
      if (newMinPrice > newPrice) {
        return res.status(400).json({ message: "Minimum price cannot be greater than listing price" });
      }
    }

    console.log(`[UpdateProduct] product owner: ${existing.userId}, request user: ${req.user.id}, role: ${req.user.role}`);
    if (existing.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }

    let savedImages = existing.images || [];

    if (req.body.images !== undefined) {
      const uploadPromises = (req.body.images || []).map(async (img) => {
        if (img.startsWith("http")) {
          return img;
        }
        return uploadBase64ToCloudinary(img);
      });
      const uploadedResults = await Promise.all(uploadPromises);
      savedImages = uploadedResults.filter(Boolean);
    }

    const allowedUpdates = {};
    if (req.body.title !== undefined) allowedUpdates.title = req.body.title;
    if (req.body.description !== undefined) allowedUpdates.description = req.body.description;
    if (req.body.price !== undefined) allowedUpdates.price = Number(req.body.price);
    if (req.body.minPrice !== undefined) allowedUpdates.minPrice = (req.body.minPrice === null || req.body.minPrice === '') ? null : Number(req.body.minPrice);
    if (req.body.categoryId !== undefined) {
      let catIdVal = req.body.categoryId;
      if (catIdVal && typeof catIdVal === 'object') {
        catIdVal = catIdVal.id || catIdVal._id;
      }
      allowedUpdates.categoryId = catIdVal;
    }
    if (req.body.dynamicAttributes !== undefined) allowedUpdates.dynamicAttributes = req.body.dynamicAttributes;
    allowedUpdates.images = savedImages;
    if (req.body.showContactInfo !== undefined) allowedUpdates.showContactInfo = req.body.showContactInfo;
    if (req.body.status !== undefined) allowedUpdates.status = req.body.status;
    allowedUpdates.updatedAt = new Date();

    await db.update(products).set(allowedUpdates).where(eq(products.id, productId));

    const result = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .limit(1);

    const row = result[0];
    res.json({
      message: "Product Updated Successfully",
      product: { ...row.products, userId: row.users, categoryId: row.categories },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const [product] = await db.select().from(products).where(eq(products.id, req.params.id)).limit(1);
    if (!product) return res.status(404).json({ message: "Product not found" });

    console.log(`[DeleteProduct] product owner: ${product.userId}, request user: ${req.user.id}, role: ${req.user.role}`);
    if (product.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }

    await db.delete(products).where(eq(products.id, req.params.id));
    res.json({ message: "Product Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getCategoryCounts = async (req, res) => {
  try {
    const result = await db.select({
      categoryId: products.categoryId,
      count: count(),
    })
      .from(products)
      .where(ne(products.status, 'sold'))
      .groupBy(products.categoryId);

    const catIds = result.map(r => r.categoryId);
    const cats = catIds.length > 0 ? await db.select().from(categories).where(inArray(categories.id, catIds)) : [];
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c.name; });

    const counts = result.map(r => ({
      _id: r.categoryId,
      name: catMap[r.categoryId] || "Other",
      count: Number(r.count),
    }));

    res.json(counts);
  } catch (error) {
    console.error("Error getting category counts:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getRecommendedProducts = async (req, res) => {
  try {
    const { governorate, city, district } = req.query;

    if (!governorate) {
      return res.status(400).json({ message: "Governorate is required for recommendations" });
    }

    let currentUserId = null;
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      token = req.cookies?.nafa3ni_token;
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (err) { }
    }

    let blockedUserIds = [];
    if (currentUserId) {
      const blocks = await db.select()
        .from(userBlocks)
        .where(
          or(
            eq(userBlocks.blockerId, currentUserId),
            eq(userBlocks.blockedId, currentUserId)
          )
        );
      blockedUserIds = blocks.map(b => b.blockerId === currentUserId ? b.blockedId : b.blockerId);
    }

    const conditions = [
      ne(products.status, 'sold'),
      ne(products.status, 'draft'),
      ne(products.status, 'reserved'),
    ];

    if (blockedUserIds.length > 0) {
      conditions.push(notInArray(products.userId, blockedUserIds));
    }

    if (currentUserId) {
      conditions.push(ne(products.userId, currentUserId));
    }

    if (req.query.search) {
      const search = `%${req.query.search}%`;
      conditions.push(
        or(
          ilike(products.title, search),
          ilike(products.description, search),
        )
      );
    }

    if (req.query.category) {
      conditions.push(eq(products.categoryId, req.query.category));
    }

    if (req.query.minPrice || req.query.maxPrice) {
      if (req.query.minPrice) conditions.push(gte(products.price, Number(req.query.minPrice)));
      if (req.query.maxPrice) conditions.push(lte(products.price, Number(req.query.maxPrice)));
    }

    const result = await db.select()
      .from(products)
      .where(and(...conditions))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt))
      .limit(200);

    const formatted = result.map(r => ({
      ...r.products,
      userId: r.users,
      categoryId: r.categories,
    }));

    // Location-based ranking
    const priority = { sameDistrict: [], sameCity: [], sameGovernorate: [], other: [] };

    for (const product of formatted) {
      const seller = product.userId;
      if (!seller) {
        priority.other.push(product);
        continue;
      }

      const pDistrict = seller.district || '';
      const pCity = seller.city || '';
      const pGovernorate = seller.governorate || '';

      if (district && pDistrict && pDistrict === district && pCity === city && pGovernorate === governorate) {
        priority.sameDistrict.push(product);
      } else if (city && pCity && pCity === city && pGovernorate === governorate) {
        priority.sameCity.push(product);
      } else if (pGovernorate && pGovernorate === governorate) {
        priority.sameGovernorate.push(product);
      } else {
        priority.other.push(product);
      }
    }

    // Apply sorting within each priority
    const sortFn = getSortFunction(req.query.sortBy);
    for (const key of Object.keys(priority)) {
      priority[key].sort(sortFn);
    }

    // Flatten: same district first, then same city, then same governorate, then others
    const maxResults = parseInt(req.query.limit) || 8;
    const ordered = [
      ...priority.sameDistrict,
      ...priority.sameCity,
      ...priority.sameGovernorate,
      ...priority.other,
    ].slice(0, maxResults);

    // Apply promotions
    const promotions = await loadActivePromotions();
    const discounted = annotateProducts(ordered, promotions);

    res.json({
      products: discounted,
      total: ordered.length,
    });
  } catch (error) {
    console.error("Error in getRecommendedProducts:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getSortFunction = (sortBy) => {
  switch (sortBy) {
    case 'price_asc': return (a, b) => a.price - b.price;
    case 'price_desc': return (a, b) => b.price - a.price;
    case 'popular': return (a, b) => (b.viewCount || 0) - (a.viewCount || 0);
    case 'newest': return (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    case 'oldest': return (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    default: return (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  }
};

module.exports = {
  getProducts,
  getUserProducts,
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
  getProductById,
  getCategoryCounts,
  getRecommendedProducts,
};
