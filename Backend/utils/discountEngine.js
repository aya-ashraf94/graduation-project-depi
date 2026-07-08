const db = require("../db");
const { flashSales, products, categories, settings, coupons, sellerTiers, users } = require("../db/schema");
const { eq, and, lte, gte, inArray } = require("drizzle-orm");

const MAX_TOTAL_DISCOUNT_PERCENT = 50;

/**
 * Load all active promotions from the database.
 *
 * Returns a promotions object that can be passed to annotateProduct,
 * annotateProducts, or calculateCheckoutPrice.
 *
 * Call this ONCE at the top of a request handler and pass it around.
 */
async function loadActivePromotions() {
  const now = new Date();

  // ── Active flash sales ──────────────────────────────────────────
  const activeFlashSales = await db.select()
    .from(flashSales)
    .where(and(
      eq(flashSales.isActive, true),
      lte(flashSales.startDate, now),
      gte(flashSales.endDate, now)
    ));

  const flashDiscounts = {};      // productId -> { percent, name }
  let hasGlobalFlashSale = false;
  let globalFlashSalePercent = null;
  let globalFlashSaleName = null;

  // Check for global "all" sale first (it overrides everything)
  for (const sale of activeFlashSales) {
    if (sale.scopeType === "all") {
      hasGlobalFlashSale = true;
      globalFlashSalePercent = sale.discountPercent;
      globalFlashSaleName = sale.name;
      break;
    }
  }

  if (!hasGlobalFlashSale) {
    // Build product-level map from category and product scoped sales
    const allProductIds = new Set();

    for (const sale of activeFlashSales) {
      let targetIds = [];
      if (sale.scopeType === "category" && sale.scopeId) {
        const catProducts = await db.select({ id: products.id })
          .from(products)
          .where(eq(products.categoryId, sale.scopeId));
        targetIds = catProducts.map(p => p.id);
      } else if (sale.scopeType === "product" && sale.scopeId) {
        targetIds = [sale.scopeId];
      }
      for (const pid of targetIds) {
        allProductIds.add(pid);
        if (!flashDiscounts[pid] || sale.discountPercent > flashDiscounts[pid].percent) {
          flashDiscounts[pid] = { percent: sale.discountPercent, name: sale.name };
        }
      }
    }
  }

  // ── Active category sales ───────────────────────────────────────
  const allCategories = await db.select().from(categories);
  const activeCategorySales = {};
  for (const cat of allCategories) {
    if (cat.discountPercent && Number(cat.discountPercent) > 0) {
      const start = cat.saleStart ? new Date(cat.saleStart) : null;
      const end = cat.saleEnd ? new Date(cat.saleEnd) : null;
      if ((!start || start <= now) && (!end || end >= now)) {
        activeCategorySales[cat.id] = {
          percent: Number(cat.discountPercent),
          saleStart: cat.saleStart,
          saleEnd: cat.saleEnd,
        };
      }
    }
  }

  // ── Global platform discount (settings table) ───────────────────
  let globalDiscount = null;
  let globalDiscountName = null;
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'discount'));
    if (row) {
      const val = parseFloat(row.value);
      if (val > 0 && val <= 100) {
        globalDiscount = val;
        globalDiscountName = 'Platform Discount';
      }
    }
  } catch (e) {
    // settings table may not exist yet
  }

  return {
    flashDiscounts,
    hasGlobalFlashSale,
    globalFlashSalePercent,
    globalFlashSaleName,
    activeCategorySales,
    globalDiscount,
    globalDiscountName,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the flash sale price for a single product (if applicable).
 * Returns null if no flash sale applies.
 */
function _getFlashSalePrice(product, promotions) {
  const price = Number(product.price);
  let flashInfo = null;

  if (promotions.hasGlobalFlashSale) {
    flashInfo = { percent: promotions.globalFlashSalePercent, name: promotions.globalFlashSaleName };
  } else if (promotions.flashDiscounts[product.id]) {
    flashInfo = promotions.flashDiscounts[product.id];
  }

  if (!flashInfo) return null;

  let salePrice = +(price * (1 - flashInfo.percent / 100)).toFixed(2);
  const minP = product.minPrice !== null && product.minPrice !== undefined ? Number(product.minPrice) : null;

  if (minP !== null) {
    if (salePrice < minP) salePrice = minP;
    if (salePrice >= price) return null; // minPrice protection makes sale ineffective
  }

  return { price: salePrice, name: flashInfo.name, percent: flashInfo.percent };
}

/**
 * Get the category sale price for a single product (if applicable).
 * Returns null if no category sale applies.
 */
function _getCategorySalePrice(product, promotions) {
  const cat = product.categoryId;
  const catId = cat && typeof cat === 'object' && !Array.isArray(cat) ? cat.id : cat;

  if (!catId || !promotions.activeCategorySales[catId]) return null;

  const catSale = promotions.activeCategorySales[catId];
  const price = Number(product.price);
  let salePrice = Math.round(price * (1 - catSale.percent / 100));
  const minP = product.minPrice !== null && product.minPrice !== undefined ? Number(product.minPrice) : null;

  if (minP !== null) {
    if (salePrice < minP) salePrice = minP;
    if (salePrice >= price) return null;
  }

  return { price: salePrice, name: null, percent: catSale.percent, isCategorySale: true };
}

/**
 * Determine the best display price considering all applicable sales.
 */
function _bestDisplayPrice(product, promotions) {
  const originalPrice = Number(product.price);
  const flash = _getFlashSalePrice(product, promotions);
  const catSale = _getCategorySalePrice(product, promotions);

  let best = null;

  if (flash && catSale) {
    best = flash.price <= catSale.price ? flash : catSale;
  } else if (flash) {
    best = flash;
  } else if (catSale) {
    best = catSale;
  }

  if (!best || best.price >= originalPrice) {
    return {
      originalPrice,
      salePrice: originalPrice,
      isOnSale: false,
      isFlashSale: false,
      flashSaleName: null,
      categorySalePercent: null,
      savingsPercent: 0,
      savingsValue: 0,
      saleEnd: null,
    };
  }

  let saleEnd = null;
  if (best.isCategorySale) {
    const cat = product.categoryId;
    const catId = cat && typeof cat === 'object' && !Array.isArray(cat) ? cat.id : cat;
    if (catId && promotions.activeCategorySales[catId]) {
      saleEnd = promotions.activeCategorySales[catId].saleEnd || null;
    }
  }

  return {
    originalPrice,
    salePrice: best.price,
    isOnSale: true,
    isFlashSale: best.isCategorySale ? false : true,
    flashSaleName: best.isCategorySale ? null : best.name,
    categorySalePercent: best.isCategorySale ? best.percent : null,
    savingsPercent: Math.round((1 - best.price / originalPrice) * 100),
    savingsValue: Math.max(0, originalPrice - best.price),
    saleEnd,
  };
}

/**
 * Calculate the price for an order (with coupon + optional offer).
 *
 * Returns { finalPrice, valid, breakdown: { originalPrice, flashSaleDiscount,
 *   categorySaleDiscount, offerAmount, couponDiscount, totalDiscount },
 *   couponValid, couponMessage, appliedRules }
 */
async function calculateCheckoutPrice(product, promotions, { couponCode, offerAmount } = {}) {
  const originalPrice = Number(product.price);
  const breakdown = {
    originalPrice,
    flashSaleDiscount: 0,
    categorySaleDiscount: 0,
    offerAmount: null,
    couponDiscount: 0,
    totalDiscount: 0,
  };
  const appliedRules = [];

  // Step 1: Determine base price (best of flash / category)
  const display = _bestDisplayPrice(product, promotions);
  let basePrice = originalPrice;

  if (display.isOnSale) {
    basePrice = display.salePrice;
    if (display.isFlashSale) {
      breakdown.flashSaleDiscount = originalPrice - display.salePrice;
      appliedRules.push({
        type: 'flash_sale',
        name: display.flashSaleName,
        amount: breakdown.flashSaleDiscount,
        priority: 1,
      });
    }
    if (display.categorySalePercent) {
      breakdown.categorySaleDiscount = originalPrice - display.salePrice;
      appliedRules.push({
        type: 'category_sale',
        name: 'Category Sale',
        amount: breakdown.categorySaleDiscount,
        priority: 1,
      });
    }
  }

  // Step 2: Apply offer amount if present (replaces sale base)
  if (offerAmount !== null && offerAmount !== undefined && offerAmount > 0) {
    basePrice = Number(offerAmount);
    breakdown.offerAmount = Number(offerAmount);
    appliedRules.push({
      type: 'offer',
      name: 'Negotiated Offer',
      amount: originalPrice - Number(offerAmount),
      priority: 2,
    });
  }

  // Step 3: Apply coupon if present
  let couponValid = false;
  let couponMessage = null;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const code = couponCode.trim().toUpperCase();
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);

    if (!coupon) {
      couponValid = false;
      couponMessage = 'Coupon code not found';
    } else if (!coupon.isActive) {
      couponValid = false;
      couponMessage = 'Coupon is inactive';
    } else if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      couponValid = false;
      couponMessage = 'Coupon has expired';
    } else if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      couponValid = false;
      couponMessage = 'Coupon usage limit reached';
    } else {
      couponValid = true;
      let discount = 0;
      if (coupon.discountType === 'percentage') {
        discount = (basePrice * coupon.discountValue) / 100;
      } else {
        discount = coupon.discountValue;
      }
      discount = Math.min(discount, basePrice);
      breakdown.couponDiscount = discount;
      breakdown.totalDiscount = breakdown.flashSaleDiscount + breakdown.categorySaleDiscount + breakdown.couponDiscount;
      appliedRules.push({
        type: 'coupon',
        name: code,
        amount: discount,
        priority: 3,
      });
    }
  }

  // Step 4: Calculate final price
  let finalPrice = basePrice - breakdown.couponDiscount;
  breakdown.totalDiscount = originalPrice - finalPrice;
  breakdown.offerAmount = breakdown.offerAmount;

  // Step 5: Cap total discount — reduce coupon portion if total exceeds cap
  const maxDiscount = originalPrice * (MAX_TOTAL_DISCOUNT_PERCENT / 100);
  const discountBeforeCoupon = originalPrice - basePrice;
  const maxCouponDiscount = Math.max(0, maxDiscount - discountBeforeCoupon);
  if (breakdown.couponDiscount > maxCouponDiscount) {
    breakdown.couponDiscount = maxCouponDiscount;
    const couponRule = appliedRules.find(r => r.type === 'coupon');
    if (couponRule) couponRule.amount = maxCouponDiscount;
  }
  finalPrice = basePrice - breakdown.couponDiscount;
  breakdown.totalDiscount = originalPrice - finalPrice;

  return {
    finalPrice: Math.max(0, finalPrice),
    valid: couponCode ? couponValid : true,
    breakdown,
    couponValid,
    couponMessage,
    appliedRules,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Annotate a single product with pricing info from active promotions.
 * Returns a new object (does not mutate the input).
 */
function annotateProduct(product, promotions) {
  if (!product) return product;
  const pricing = _bestDisplayPrice(product, promotions);
  return { ...product, ...pricing };
}

/**
 * Annotate an array of products with pricing info.
 */
function annotateProducts(productsList, promotions) {
  return productsList.map(p => annotateProduct(p, promotions));
}

/**
 * Load the platform fee percent from settings.
 * Defaults to 5% if not set.
 */
async function loadPlatformFeePercent() {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'platformFeePercent'));
    if (row) {
      const val = parseFloat(row.value);
      if (val >= 0 && val <= 100) return val;
    }
  } catch (e) { /* settings table may not exist yet */ }
  return 5; // default 5%
}

/**
 * Calculate the platform fee for a given price.
 */
function calculatePlatformFee(price, platformFeePercent) {
  const fee = price * (platformFeePercent / 100);
  return Math.round(fee * 100) / 100; // round to cents
}

/**
 * Load the effective platform fee percent for a specific seller.
 * Considers their active seller tier override. Falls back to global setting.
 */
async function loadSellerEffectiveFeePercent(sellerId) {
  try {
    const [user] = await db.select({ tierId: users.tierId, tierExpiresAt: users.tierExpiresAt })
      .from(users).where(eq(users.id, sellerId)).limit(1);
    if (user && user.tierId && user.tierExpiresAt && new Date(user.tierExpiresAt) > new Date()) {
      const [tier] = await db.select().from(sellerTiers).where(eq(sellerTiers.id, user.tierId)).limit(1);
      if (tier && tier.feePercent !== null && tier.feePercent >= 0) {
        return tier.feePercent;
      }
    }
  } catch (e) { /* ignore */ }
  return loadPlatformFeePercent();
}

module.exports = {
  loadActivePromotions,
  annotateProduct,
  annotateProducts,
  calculateCheckoutPrice,
  loadPlatformFeePercent,
  calculatePlatformFee,
  loadSellerEffectiveFeePercent,
};
