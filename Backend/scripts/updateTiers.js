require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await pool.query(`UPDATE seller_tiers SET fee_percent = 7, yearly_price = 99, monthly_promotion_credits = 5, description = 'Priority support and exclusive tools for serious sellers.', featured_listings_included = 0 WHERE name = 'Bronze'`);
    await pool.query(`UPDATE seller_tiers SET fee_percent = 6, yearly_price = 199, monthly_promotion_credits = 12, description = 'Everything in Bronze, plus higher credits and lower fees.', featured_listings_included = 0 WHERE name = 'Silver'`);
    await pool.query(`UPDATE seller_tiers SET fee_percent = 5, yearly_price = 399, monthly_promotion_credits = 25, description = 'Maximum savings and premium visibility for top sellers.', featured_listings_included = 0 WHERE name = 'Gold'`);
    await pool.query(`UPDATE seller_tiers SET description = 'Standard platform fee with no monthly subscription.' WHERE name = 'Free'`);
    console.log('Tier updates applied successfully.');
  } catch (err) {
    console.error('Update error:', err.message);
  } finally {
    await pool.end();
  }
})();
