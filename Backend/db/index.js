const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('./schema');

let db;

const getDb = () => {
  if (!db) {
    const { getPool } = require('../config/db');
    const pool = getPool();
    db = drizzle(pool, { schema });
  }
  return db;
};

module.exports = getDb();
