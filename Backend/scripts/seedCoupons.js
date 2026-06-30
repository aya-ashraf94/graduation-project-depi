require('dotenv').config();
const db = require('../db');
const { coupons } = require('../db/schema');
const { eq } = require('drizzle-orm');

async function seed() {
  console.log("Seeding test coupons...");
  const testCoupons = [
    { code: "LUCKY20", discountType: "percentage", discountValue: 20, isActive: true, maxUses: 100, usedCount: 0, maxPerUser: 1 },
    { code: "SCRATCH50", discountType: "percentage", discountValue: 50, isActive: true, maxUses: 50, usedCount: 0, maxPerUser: 1 },
    { code: "SAVE10", discountType: "fixed", discountValue: 10, isActive: true, maxUses: 200, usedCount: 0, maxPerUser: 3 }
  ];

  for (const c of testCoupons) {
    try {
      // Check if exists
      const [existing] = await db.select().from(coupons).where(eq(coupons.code, c.code)).limit(1);
      if (!existing) {
        await db.insert(coupons).values(c);
        console.log(`Inserted coupon: ${c.code}`);
      } else {
        // Only update usage limits, don't reset usedCount
        const { usedCount, ...updates } = c;
        await db.update(coupons).set(updates).where(eq(coupons.code, c.code));
        console.log(`Updated coupon: ${c.code}`);
      }
    } catch (err) {
      console.error(`Error seeding ${c.code}:`, err);
    }
  }
  console.log("Seeding complete. Exiting.");
  process.exit(0);
}

// Wait for pool connection
setTimeout(seed, 1000);
