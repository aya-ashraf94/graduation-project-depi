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

// Get platform fee percent (public)
router.get('/platform-fee', async (req, res) => {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'platformFeePercent'));
    const platformFeePercent = row ? parseFloat(row.value) : 5.0;
    res.json({ platformFeePercent });
  } catch (error) {
    console.error('Error fetching platform fee:', error);
    res.json({ platformFeePercent: 5.0 });
  }
});

// Update platform fee percent (admin only)
router.put('/platform-fee', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { platformFeePercent } = req.body;
    if (platformFeePercent === undefined || isNaN(parseFloat(platformFeePercent))) {
      return res.status(400).json({ message: 'Invalid platform fee value' });
    }

    const numericFee = parseFloat(platformFeePercent);
    if (numericFee < 0 || numericFee > 100) {
      return res.status(400).json({ message: 'Platform fee must be between 0 and 100' });
    }

    const [existing] = await db.select().from(settings).where(eq(settings.key, 'platformFeePercent'));
    if (existing) {
      await db.update(settings)
        .set({ value: numericFee.toString() })
        .where(eq(settings.key, 'platformFeePercent'));
    } else {
      await db.insert(settings)
        .values({ key: 'platformFeePercent', value: numericFee.toString() });
    }

    res.json({ message: 'Platform fee updated successfully', platformFeePercent: numericFee });
  } catch (error) {
    console.error('Error updating platform fee:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get COD fee percent (public)
router.get('/cod-fee', async (req, res) => {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'codFeePercent'));
    const codFeePercent = row ? parseFloat(row.value) : 0;
    res.json({ codFeePercent });
  } catch (error) {
    console.error('Error fetching COD fee:', error);
    res.json({ codFeePercent: 0 });
  }
});

// Update COD fee percent (admin only)
router.put('/cod-fee', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { codFeePercent } = req.body;
    if (codFeePercent === undefined || isNaN(parseFloat(codFeePercent))) {
      return res.status(400).json({ message: 'Invalid COD fee value' });
    }

    const numericFee = parseFloat(codFeePercent);
    if (numericFee < 0 || numericFee > 100) {
      return res.status(400).json({ message: 'COD fee must be between 0 and 100' });
    }

    const [existing] = await db.select().from(settings).where(eq(settings.key, 'codFeePercent'));
    if (existing) {
      await db.update(settings)
        .set({ value: numericFee.toString() })
        .where(eq(settings.key, 'codFeePercent'));
    } else {
      await db.insert(settings)
        .values({ key: 'codFeePercent', value: numericFee.toString() });
    }

    res.json({ message: 'COD fee updated successfully', codFeePercent: numericFee });
  } catch (error) {
    console.error('Error updating COD fee:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
