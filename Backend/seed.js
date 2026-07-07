const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const {
  users, categories, categoryAttributes, products,
  conversations, conversationParticipants, messages,
  orders, reviews, reports, notifications, newsletters, userWishlist
} = require('./db/schema');

async function seedCollection(pool, table, filename, transformFn = null) {
  const filepath = path.join(__dirname, 'data', filename);
  if (!fs.existsSync(filepath)) {
    console.log(`Seed file ${filename} not found. Skipping.`);
    return;
  }

  let records = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  if (!records || records.length === 0) {
    console.log(`No records found in ${filename}.`);
    return;
  }

  if (transformFn) {
    records = await transformFn(records);
  }

  console.log(`Importing ${records.length} records for ${filename}...`);

  const colNames = table._.columns;

  for (const record of records) {
    const values = {};
    for (const [colName, col] of Object.entries(colNames)) {
      const MONGO_KEY_MAP = {
        id: '_id', userId: 'userId', categoryId: 'categoryId',
        productId: 'productId', buyerId: 'buyerId', sellerId: 'sellerId',
        conversationId: 'conversationId', senderId: 'senderId',
        reviewerId: 'reviewerId', revieweeId: 'revieweeId',
        reporterId: 'reporterId', orderId: 'orderId',
        linkedEntityId: 'linkedEntityId', linkedRoute: 'linkedRoute',
        resetPasswordToken: 'resetPasswordToken', resetPasswordExpires: 'resetPasswordExpires',
        paymentMethod: 'paymentMethod', shippingAddress: 'shippingAddress',
        trackingNumber: 'trackingNumber', phoneNumber: 'phoneNumber',
        showContactInfo: 'showContactInfo', soldByNafa3ni: 'soldByNafa3ni',
        isVerified: 'isVerified', isSuspended: 'isSuspended',
        viewCount: 'viewCount', totalSales: 'totalSales',
        totalPurchases: 'totalPurchases', successRate: 'successRate',
        dynamicAttributes: 'dynamicAttributes', hasOther: 'hasOther',
        createdAt: 'createdAt', updatedAt: 'updatedAt',
      };
      const mongoKey = MONGO_KEY_MAP[colName] || colName;

      if (record[mongoKey] !== undefined) {
        if (colName === 'id' || colName === '_id') {
          values.id = record._id || record.id;
        } else if (colName === 'tags' && Array.isArray(record[mongoKey])) {
          values.tags = record[mongoKey];
        } else if (colName === 'images' && Array.isArray(record[mongoKey])) {
          values.images = record[mongoKey];
        } else if (colName === 'options' && Array.isArray(record[mongoKey])) {
          values.options = record[mongoKey];
        } else if (colName === 'dynamicAttributes') {
          values.dynamicAttributes = record[mongoKey] || {};
        } else if (colName === 'createdAt' || colName === 'updatedAt' || colName === 'resetPasswordExpires') {
          const v = record[mongoKey];
          values[colName] = v ? new Date(v) : null;
        } else {
          values[colName] = record[mongoKey];
        }
      }
    }

    if (Object.keys(values).length > 0) {
      try {
        const pgKey = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();
        const cols = Object.keys(values).map(c => `"${pgKey(c)}"`).join(', ');
        const params = Object.keys(values).map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO "${pgKey(table._.name)}" (${cols}) VALUES (${params}) ON CONFLICT (id) DO NOTHING`;

        const paramValues = Object.values(values).map(v => {
          if (v instanceof Date) return v.toISOString();
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return v;
        });

        await pool.query(query, paramValues);
      } catch (err) {
        console.error(`Error seeding record in ${filename}:`, err.message);
      }
    }
  }

  console.log(`${filename}: ${records.length} records processed.`);
}

async function seedData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to Neon PostgreSQL...');
    await pool.connect();
    console.log('Connected successfully.');

    const dataDir = path.join(__dirname, 'data');

    await seedCollection(pool, categories, 'categories.json');

    const userTransform = async (records) => {
      console.log('Resetting all seeded user passwords to default: 123456');
      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('123456', salt);
      records.forEach(user => { user.password = defaultHash; });
      return records;
    };
    await seedCollection(pool, users, 'users.json', userTransform);

    await seedCollection(pool, products, 'products.json');
    await seedCollection(pool, conversations, 'conversations.json');
    await seedCollection(pool, messages, 'messages.json');
    await seedCollection(pool, orders, 'orders.json');
    await seedCollection(pool, reviews, 'reviews.json');
    await seedCollection(pool, reports, 'reports.json');
    await seedCollection(pool, notifications, 'notifications.json');
    await seedCollection(pool, newsletters, 'newsletters.json');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
    console.log('Disconnected from database.');
  }
}

seedData();
