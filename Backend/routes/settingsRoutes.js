const express = require('express');
const router = express.Router();
const db = require('../db');
const { settings } = require('../db/schema');
const { eq } = require('drizzle-orm');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Get discount setting (public)
router.get('/discount', async (req, res) => {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'discount'));
    const discount = row ? parseFloat(row.value) : 7.0;
    res.json({ discount });
  } catch (error) {
    console.error('Error fetching discount setting:', error);
    res.json({ discount: 7.0 }); // fallback to default
  }
});

// Update discount setting (admin only)
router.put('/discount', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { discount } = req.body;
    if (discount === undefined || isNaN(parseFloat(discount))) {
      return res.status(400).json({ message: 'Invalid discount value' });
    }
    
    const numericDiscount = parseFloat(discount);
    if (numericDiscount < 0 || numericDiscount > 100) {
      return res.status(400).json({ message: 'Discount must be between 0 and 100' });
    }
    
    // Check if key exists, update or insert
    const [existing] = await db.select().from(settings).where(eq(settings.key, 'discount'));
    if (existing) {
      await db.update(settings)
        .set({ value: numericDiscount.toString() })
        .where(eq(settings.key, 'discount'));
    } else {
      await db.insert(settings)
        .values({ key: 'discount', value: numericDiscount.toString() });
    }
    
    res.json({ message: 'Discount updated successfully', discount: numericDiscount });
  } catch (error) {
    console.error('Error updating discount setting:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
