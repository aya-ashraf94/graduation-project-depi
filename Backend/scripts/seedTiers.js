require("dotenv").config();
const db = require("../db");
const { sellerTiers } = require("../db/schema");
const { eq } = require("drizzle-orm");

const tiers = [
  {
    name: "Free",
    description: "Standard platform fee with no monthly subscription.",
    feePercent: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    featuredListingsIncluded: 0,
    freeFeaturedDuration: 7,
    monthlyPromotionCredits: 0,
    badgeLabel: null,
  },
  {
    name: "Bronze",
    description: "Priority support and exclusive tools for serious sellers.",
    feePercent: 7,
    monthlyPrice: 9.99,
    yearlyPrice: 99,
    featuredListingsIncluded: 0,
    freeFeaturedDuration: 2,
    monthlyPromotionCredits: 5,
    badgeLabel: "Bronze Seller",
  },
  {
    name: "Silver",
    description: "Everything in Bronze, plus higher credits and lower fees.",
    feePercent: 6,
    monthlyPrice: 19.99,
    yearlyPrice: 199,
    featuredListingsIncluded: 0,
    freeFeaturedDuration: 7,
    monthlyPromotionCredits: 12,
    badgeLabel: "Silver Seller",
  },
  {
    name: "Gold",
    description: "Maximum savings and premium visibility for top sellers.",
    feePercent: 5,
    monthlyPrice: 39.99,
    yearlyPrice: 399,
    featuredListingsIncluded: 0,
    freeFeaturedDuration: 7,
    monthlyPromotionCredits: 25,
    badgeLabel: "Gold Seller",
  },
];

async function seedTiers() {
  console.log("Seeding seller tiers...");
  for (const t of tiers) {
    const [existing] = await db.select().from(sellerTiers).where(eq(sellerTiers.name, t.name)).limit(1);
    if (!existing) {
      await db.insert(sellerTiers).values(t);
      console.log(`  Created tier: ${t.name}`);
    } else {
      console.log(`  Tier already exists: ${t.name}`);
    }
  }
  console.log("Done seeding tiers.");
  process.exit(0);
}

seedTiers().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});