require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await pool.query("INSERT INTO settings (key, value) VALUES ('platformFeePercent', '5') ON CONFLICT (key) DO UPDATE SET value = '5'");
    console.log('Default platform fee (5%) seeded.');
  } catch (err) {
    console.error('Error seeding platform fee:', err.message);
  } finally {
    await pool.end();
  }
})();
