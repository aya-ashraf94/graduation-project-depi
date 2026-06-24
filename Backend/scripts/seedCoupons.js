require('dotenv').config();
const db = require('../db');
const { coupons } = require('../db/schema');
const { eq } = require('drizzle-orm');

async function seed() {
  console.log("Seeding test coupons...");
  const testCoupons = [
    { code: "LUCKY20", discountType: "percentage", discountValue: 20, isActive: true },
    { code: "SCRATCH50", discountType: "percentage", discountValue: 50, isActive: true },
    { code: "SAVE10", discountType: "fixed", discountValue: 10, isActive: true }
  ];

  for (const c of testCoupons) {
    try {
      // Check if exists
      const [existing] = await db.select().from(coupons).where(eq(coupons.code, c.code)).limit(1);
      if (!existing) {
        await db.insert(coupons).values(c);
        console.log(`Successfully seeded coupon: ${c.code}`);
      } else {
        console.log(`Coupon ${c.code} already exists.`);
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
