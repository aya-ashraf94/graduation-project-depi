require("dotenv").config();
const db = require("../db");
const { sellerTiers } = require("../db/schema");
const { eq } = require("drizzle-orm");

const tiers = [
  {
    name: "Free",
    description: "Basic seller tier. No monthly fee.",
    feePercent: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    featuredListingsIncluded: 0,
    badgeLabel: null,
  },
  {
    name: "Bronze",
    description: "Reduced platform fee (3%) + 1 free featured listing per month.",
    feePercent: 3,
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    featuredListingsIncluded: 1,
    badgeLabel: "Bronze Seller",
  },
  {
    name: "Silver",
    description: "Reduced platform fee (2%) + 3 free featured listings per month + priority support.",
    feePercent: 2,
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    featuredListingsIncluded: 3,
    badgeLabel: "Silver Seller",
  },
  {
    name: "Gold",
    description: "Minimal platform fee (1%) + 10 free featured listings per month + priority support + verified badge.",
    feePercent: 1,
    monthlyPrice: 39.99,
    yearlyPrice: 399.99,
    featuredListingsIncluded: 10,
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