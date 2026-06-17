const { Pool } = require('pg');

let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
};

const connectDB = async () => {
  try {
    const p = getPool();
    const client = await p.connect();
    console.log('Neon PostgreSQL Connected');
    client.release();
  } catch (error) {
    console.error('Database connection error:', error.message || error);
    process.exit(1);
  }
};

module.exports = { getPool, connectDB };
