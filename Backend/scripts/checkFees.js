require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const { rows: settings } = await pool.query("SELECT * FROM settings WHERE key = 'platformFeePercent'");
  console.log('Platform fee setting:', JSON.stringify(settings));

  const { rows: orders } = await pool.query(
    "SELECT id, price, original_price, platform_fee, flash_sale_discount, category_sale_discount, coupon_discount, offer_amount FROM orders WHERE platform_fee > 0 LIMIT 10"
  );
  console.log('Orders with platform fee > 0:');
  orders.forEach(o => {
    const effectiveDiscount = (o.original_price || o.price) - o.price;
    console.log(`  Order ${o.id.slice(0,8)}: orig=${o.original_price} price=${o.price} fee=${o.platform_fee} (${((o.platform_fee/o.price)*100).toFixed(1)}%) discounts: flash=${o.flash_sale_discount} cat=${o.category_sale_discount} coupon=${o.coupon_discount} offer=${o.offer_amount}`);
  });

  await pool.end();
})();
