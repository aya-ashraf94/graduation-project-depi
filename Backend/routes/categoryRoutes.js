const express = require('express');
const router = express.Router();
const db = require("../db");
const { categories, categoryAttributes } = require("../db/schema");
const { eq } = require("drizzle-orm");
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.get('/', async (req, res) => {
  try {
    const result = await db.select().from(categories);
    const catsWithAttrs = await Promise.all(result.map(async (cat) => {
      const attrs = await db.select()
        .from(categoryAttributes)
        .where(eq(categoryAttributes.categoryId, cat.id));
      return { ...cat, attributes: attrs };
    }));
    res.json(catsWithAttrs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, attributes } = req.body;
    const [cat] = await db.insert(categories).values({ name }).returning();

    if (attributes && attributes.length > 0) {
      await db.insert(categoryAttributes).values(
        attributes.map(attr => ({
          categoryId: cat.id,
          name: attr.name,
          type: attr.type,
          options: attr.options || [],
          required: attr.required !== undefined ? attr.required : true,
          hasOther: attr.hasOther || false,
        }))
      );
    }

    const attrs = await db.select()
      .from(categoryAttributes)
      .where(eq(categoryAttributes.categoryId, cat.id));

    res.status(201).json({ ...cat, attributes: attrs });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.delete(categoryAttributes).where(eq(categoryAttributes.categoryId, req.params.id));
    await db.delete(categories).where(eq(categories.id, req.params.id));
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
