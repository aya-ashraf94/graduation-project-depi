const db = require("../db");
const { products, categories, users } = require("../db/schema");
const { eq, ilike, or, and, ne, gte, lte, inArray, desc, asc, sql, count } = require("drizzle-orm");
const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

const isCloudinaryConfigured = () => {
  return process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET;
};

const saveBase64ImageLocally = (base64Str) => {
  if (!base64Str) return null;
  if (base64Str.startsWith("http") || base64Str.startsWith("/uploads")) return base64Str;
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return base64Str;
  const extension = matches[1].split("/")[1] || "png";
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

    res.json(data);
  } catch (error) {
    console.error("Error in getProductById:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getProducts = async (req, res) => {
  try {
    const conditions = [ne(products.status, 'sold')];

    if (req.query.category) {
      const catQuery = req.query.category.toLowerCase();
      let matchingIds = [];

      if (['tops', 'electronics', 'furniture', 'sports', 'books'].includes(catQuery)) {
        const regexMap = {
          tops: /clothes|apparel/i,
          electronics: /laptop|mobile|electronics/i,
          furniture: /appliance|furniture/i,
          sports: /sport/i,
          books: /book/i,
        };
        const regex = regexMap[catQuery];
        const allCats = await db.select().from(categories);
        matchingIds = allCats.filter(c => regex.test(c.name)).map(c => c.id);
      } else if (catQuery === 'other') {
        const allCats = await db.select().from(categories);
        const excluded = /clothes|apparel|laptop|mobile|electronics|appliance|furniture|sport|book/i;
        matchingIds = allCats.filter(c => !excluded.test(c.name)).map(c => c.id);
      } else {
        const matchCats = await db.select().from(categories)
          .where(ilike(categories.name, `%${req.query.category}%`));
        matchingIds = matchCats.map(c => c.id);
      }

      if (matchingIds.length > 0) {
        conditions.push(inArray(products.categoryId, matchingIds));
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
          sql`${products.dynamicAttributes}->>'brand' ILIKE ${search}`,
          sql`${products.dynamicAttributes}->>'Brand' ILIKE ${search}`
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

    const limit = parseInt(req.query.limit);

    let productQuery = db.select()
      .from(products)
      .where(and(...conditions))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(orderBy);

    if (!isNaN(limit) && limit > 0) {
      productQuery = productQuery.limit(limit);
    }

    const result = await productQuery;

    const formatted = result.map(r => ({
      ...r.products,
      categoryId: r.categories,
    }));

    res.json(formatted);
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

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getUserProducts = async (req, res) => {
  try {
    const result = await db.select()
      .from(products)
      .where(eq(products.userId, req.params.userId))
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const formatted = result.map(r => ({
      ...r.products,
      userId: r.users,
      categoryId: r.categories,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const createProduct = async (req, res) => {
  try {
    const { title, description, price, categoryId, dynamicAttributes, images, location, phoneNumber, showContactInfo } = req.body;

    if (!title || !price || !categoryId || !location || !phoneNumber) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const savedImages = [];
    for (const img of (images || [])) {
      const uploaded = await uploadBase64ToCloudinary(img);
      if (uploaded) savedImages.push(uploaded);
    }

    const [product] = await db.insert(products).values({
      title,
      description: description || null,
      price,
      categoryId,
      dynamicAttributes: dynamicAttributes || {},
      images: savedImages,
      location,
      phoneNumber,
      showContactInfo: showContactInfo ?? true,
      userId: req.user.id,
      soldByNafa3ni: req.user.role === 'admin',
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

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }

    let savedImages = existing.images || [];

    if (req.body.images !== undefined) {
      savedImages = [];
      for (const img of (req.body.images || [])) {
        if (img.startsWith("http")) {
          savedImages.push(img);
          continue;
        }
        const uploaded = await uploadBase64ToCloudinary(img);
        if (uploaded) savedImages.push(uploaded);
      }
    }

    const allowedUpdates = {};
    if (req.body.title !== undefined) allowedUpdates.title = req.body.title;
    if (req.body.description !== undefined) allowedUpdates.description = req.body.description;
    if (req.body.price !== undefined) allowedUpdates.price = req.body.price;
    if (req.body.categoryId !== undefined) allowedUpdates.categoryId = req.body.categoryId;
    if (req.body.dynamicAttributes !== undefined) allowedUpdates.dynamicAttributes = req.body.dynamicAttributes;
    allowedUpdates.images = savedImages;
    if (req.body.location !== undefined) allowedUpdates.location = req.body.location;
    if (req.body.phoneNumber !== undefined) allowedUpdates.phoneNumber = req.body.phoneNumber;
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

    if (product.userId !== req.user.id) {
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

module.exports = {
  getProducts,
  getUserProducts,
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
  getProductById,
  getCategoryCounts,
};
