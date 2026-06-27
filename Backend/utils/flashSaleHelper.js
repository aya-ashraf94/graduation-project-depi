const db = require("../db");
const { flashSales, products } = require("../db/schema");
const { and, eq, lte, gte, inArray } = require("drizzle-orm");

/**
 * Get all active flash sales and return a map of productId -> discountPercent
 * so that controllers can apply the discount when fetching products.
 */
async function getActiveFlashSaleDiscounts() {
  const now = new Date();
  const activeSales = await db.select()
    .from(flashSales)
    .where(and(
      eq(flashSales.isActive, true),
      lte(flashSales.startDate, now),
      gte(flashSales.endDate, now)
    ));

  if (activeSales.length === 0) return { discounts: {}, sales: [] };

  const discounts = {}; // productId -> { percent, saleName }
  const affectedProducts = new Set();

  for (const sale of activeSales) {
    if (sale.scopeType === "all") {
      // All products get this discount (but we don't know which yet - mark as global)
      discounts["__global__"] = { percent: sale.discountPercent, name: sale.name };
      break; // Global overrides all
    }
  }

  // If global discount exists, return it immediately
  if (discounts["__global__"]) {
    return { discounts, sales: activeSales };
  }

  // Process category-scoped and product-scoped sales
  const categoryIds = [];
  const productIds = [];

  for (const sale of activeSales) {
    if (sale.scopeType === "category" && sale.scopeId) {
      categoryIds.push(sale.scopeId);
    } else if (sale.scopeType === "product" && sale.scopeId) {
      productIds.push(sale.scopeId);
    }
  }

  // Get all products in affected categories
  if (categoryIds.length > 0) {
    const catProducts = await db.select({ id: products.id })
      .from(products)
      .where(inArray(products.categoryId, categoryIds));
    for (const p of catProducts) {
      affectedProducts.add(p.id);
    }
  }

  // Add individually targeted products
  for (const pid of productIds) {
    affectedProducts.add(pid);
  }

  // Build discount map - highest discount wins for overlapping
  for (const sale of activeSales) {
    let targetIds = [];
    if (sale.scopeType === "all") {
      // handled above
    } else if (sale.scopeType === "category" && sale.scopeId) {
      const catProducts = await db.select({ id: products.id })
        .from(products)
        .where(eq(products.categoryId, sale.scopeId));
      targetIds = catProducts.map(p => p.id);
    } else if (sale.scopeType === "product" && sale.scopeId) {
      targetIds = [sale.scopeId];
    }

    for (const pid of targetIds) {
      if (!discounts[pid] || sale.discountPercent > discounts[pid].percent) {
        discounts[pid] = { percent: sale.discountPercent, name: sale.name };
      }
    }
  }

  return { discounts, sales: activeSales };
}

/**
 * Apply flash sale discount to a single product object.
 * Adds salePrice, originalPrice, flashSaleName, and isFlashSale fields.
 */
function applyDiscount(product, discounts) {
  if (!product || !discounts) return product;

  let discountInfo = null;

  // Check global discount
  if (discounts["__global__"]) {
    discountInfo = discounts["__global__"];
  } else if (discounts[product.id]) {
    discountInfo = discounts[product.id];
  }

  if (discountInfo) {
    return {
      ...product,
      originalPrice: product.price,
      salePrice: +(product.price * (1 - discountInfo.percent / 100)).toFixed(2),
      flashSaleName: discountInfo.name,
      isFlashSale: true,
    };
  }

  return product;
}

/**
 * Apply flash sale discount to an array of products.
 */
function applyDiscounts(productsList, discounts) {
  return productsList.map(p => applyDiscount(p, discounts));
}

module.exports = {
  getActiveFlashSaleDiscounts,
  applyDiscount,
  applyDiscounts,
};
