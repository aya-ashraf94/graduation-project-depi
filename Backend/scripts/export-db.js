const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function exportData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to Neon PostgreSQL...');
    await pool.connect();
    console.log('Connected successfully.');

    const tables = [
      'users', 'categories', 'category_attributes', 'products',
      'conversations', 'conversation_participants', 'messages',
      'orders', 'reviews', 'reports', 'notifications', 'contacts',
      'newsletters', 'user_wishlist'
    ];

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
      console.log('Created data/ directory.');
    }

    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM "${table}"`);
      const filename = `${table}.json`;

      const cleanRows = rows.map(row => {
        const clean = {};
        for (const [key, value] of Object.entries(row)) {
          if (value instanceof Date) {
            clean[key] = value.toISOString();
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            clean[key] = value;
          } else {
            clean[key] = value;
          }
        }
        return clean;
      });

      fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(cleanRows, null, 2), 'utf8');
      console.log(`Exported ${rows.length} records from ${table}`);
    }

    console.log('Export completed successfully!');
  } catch (error) {
    console.error('Error exporting database data:', error);
  } finally {
    await pool.end();
    console.log('Disconnected from database.');
  }
}

exportData();
