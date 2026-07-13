const express = require('express');
const router = express.Router();
const db = require("../db");
const { categories, categoryAttributes } = require("../db/schema");
const { eq, sql } = require("drizzle-orm");
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.get('/', async (req, res) => {
  try {
    const result = await db.select().from(categories).orderBy(sql`name = 'Other' ASC, name ASC`);
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

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, attributes } = req.body;
    if (name !== undefined) {
      const [updated] = await db.update(categories)
        .set({ name })
        .where(eq(categories.id, req.params.id))
        .returning();
      if (!updated) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }

    if (attributes !== undefined) {
      await db.delete(categoryAttributes).where(eq(categoryAttributes.categoryId, req.params.id));
      if (attributes.length > 0) {
        await db.insert(categoryAttributes).values(
          attributes.map(attr => ({
            categoryId: req.params.id,
            name: attr.name,
            type: attr.type,
            options: attr.options || [],
            required: attr.required !== undefined ? attr.required : true,
            hasOther: attr.hasOther || false,
          }))
        );
      }
    }

    const [cat] = await db.select().from(categories).where(eq(categories.id, req.params.id));
    const attrs = await db.select()
      .from(categoryAttributes)
      .where(eq(categoryAttributes.categoryId, req.params.id));

    res.json({ ...cat, attributes: attrs });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/sale', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { discountPercent, saleStart, saleEnd } = req.body;
    const updateData = {};
    if (discountPercent !== undefined) updateData.discountPercent = discountPercent === null ? null : discountPercent;
    if (saleStart !== undefined) updateData.saleStart = saleStart ? new Date(saleStart) : null;
    if (saleEnd !== undefined) updateData.saleEnd = saleEnd ? new Date(saleEnd) : null;

    const [updated] = await db.update(categories)
      .set(updateData)
      .where(eq(categories.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/sale/clear', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [updated] = await db.update(categories)
      .set({ discountPercent: null, saleStart: null, saleEnd: null })
      .where(eq(categories.id, req.params.id))
      .returning();
    if (!updated) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
