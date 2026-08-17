const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const idMap = {};

function newId() {
  return crypto.randomUUID();
}

function mapId(oldId) {
  if (!oldId) return null;
  if (!idMap[oldId]) {
    idMap[oldId] = newId();
  }
  return idMap[oldId];
}

function toPgDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function loadJson(filename) {
  const filepath = path.join(__dirname, '..', 'data', filename);
  if (!fs.existsSync(filepath)) return [];
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. Categories + Attributes
    const categories = loadJson('categories.json');
    for (const cat of categories) {
      const newCatId = mapId(cat._id);
      await client.query(
        `INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [newCatId, cat.name]
      );
      if (cat.attributes) {
        for (const attr of cat.attributes) {
          await client.query(
            `INSERT INTO category_attributes (id, category_id, name, type, options, required, has_other)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
            [mapId(attr._id), newCatId, attr.name, attr.type,
             attr.options || [], attr.required ?? true, attr.hasOther ?? false]
          );
        }
      }
    }
    console.log(`Imported ${categories.length} categories with attributes.`);

    // 2. Users
    const users = loadJson('users.json');
    for (const u of users) {
      await client.query(
        `INSERT INTO users
         (id, name, email, password, role, is_verified, is_suspended, avatar, bio,
          phone_number, location, tags, rating, total_sales, total_purchases, success_rate,
          reset_password_token, reset_password_expires, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (id) DO NOTHING`,
        [
          mapId(u._id), u.name, u.email, u.password, u.role || 'user',
          u.isVerified ?? false, u.isSuspended ?? false, u.avatar || '',
          u.bio || '', u.phoneNumber || '', u.location || '', u.tags || [],
          u.rating ?? 5.0, u.totalSales ?? 0, u.totalPurchases ?? 0, u.successRate ?? 100,
          u.resetPasswordToken || null, toPgDate(u.resetPasswordExpires),
          toPgDate(u.createdAt), toPgDate(u.updatedAt)
        ]
      );
      // Wishlist items
      if (u.wishlist && u.wishlist.length > 0) {
        for (const pid of u.wishlist) {
          await client.query(
            `INSERT INTO user_wishlist (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [mapId(u._id), mapId(pid)]
          );
        }
      }
    }
    console.log(`Imported ${users.length} users.`);

    // 3. Products
    const products = loadJson('products.json');
    for (const p of products) {
      await client.query(
        `INSERT INTO products
         (id, title, description, price, images, category_id, dynamic_attributes,
          location, phone_number, show_contact_info, user_id, sold_by_nafa3ni,
          is_verified, status, view_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [
          mapId(p._id), p.title, p.description || null, p.price,
          p.images || [], mapId(p.categoryId),
          JSON.stringify(p.dynamicAttributes || {}),
          p.location, p.phoneNumber, p.showContactInfo ?? true,
          mapId(p.userId), p.soldByNafa3ni ?? false,
          p.isVerified ?? false, p.status || 'active', p.viewCount ?? 0,
          toPgDate(p.createdAt), toPgDate(p.updatedAt)
        ]
      );
    }
    console.log(`Imported ${products.length} products.`);

    // 4. Conversations
    const conversations = loadJson('conversations.json');
    for (const c of conversations) {
      await client.query(
        `INSERT INTO conversations (id, product_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [mapId(c._id), c.productId ? mapId(c.productId) : null,
         toPgDate(c.createdAt), toPgDate(c.updatedAt)]
      );
      if (c.participants) {
        for (const pid of c.participants) {
          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [mapId(c._id), mapId(pid)]
          );
        }
      }
    }
    console.log(`Imported ${conversations.length} conversations.`);

    // 5. Messages
    const messages = loadJson('messages.json');
    for (const m of messages) {
      await client.query(
        `INSERT INTO messages
         (id, conversation_id, sender_id, content, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [
          mapId(m._id), mapId(m.conversationId), mapId(m.senderId),
          m.content, m.status || 'sent',
          toPgDate(m.createdAt), toPgDate(m.updatedAt)
        ]
      );
    }
    console.log(`Imported ${messages.length} messages.`);

    // Update conversation last_message_id
    for (const c of conversations) {
      if (c.lastMessage) {
        await client.query(
          `UPDATE conversations SET last_message_id = $1 WHERE id = $2`,
          [mapId(c.lastMessage), mapId(c._id)]
        );
      }
    }

    // 6. Orders
    const orders = loadJson('orders.json');
    for (const o of orders) {
      await client.query(
        `INSERT INTO orders
         (id, product_id, buyer_id, seller_id, price, status,
          payment_method, shipping_address, notes, tracking_number, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO NOTHING`,
        [
          mapId(o._id), mapId(o.productId), mapId(o.buyerId), mapId(o.sellerId),
          o.price, o.status || 'pending', o.paymentMethod, o.shippingAddress,
          o.notes || null, o.trackingNumber || null,
          toPgDate(o.createdAt), toPgDate(o.updatedAt)
        ]
      );
    }
    console.log(`Imported ${orders.length} orders.`);

    // 7. Reviews
    const reviews = loadJson('reviews.json');
    for (const r of reviews) {
      await client.query(
        `INSERT INTO reviews
         (id, order_id, reviewer_id, reviewee_id, product_id, rating, comment, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [
          mapId(r._id), mapId(r.orderId), mapId(r.reviewerId),
          mapId(r.revieweeId), mapId(r.productId), r.rating, r.comment,
          toPgDate(r.createdAt), toPgDate(r.updatedAt)
        ]
      );
    }
    console.log(`Imported ${reviews.length} reviews.`);

    // 8. Reports
    const reports = loadJson('reports.json');
    for (const r of reports) {
      if (!r._id) continue;
      await client.query(
        `INSERT INTO reports
         (id, product_id, reporter_id, reason, details, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [
          mapId(r._id), mapId(r.productId), mapId(r.reporterId),
          r.reason, r.details || null,
          toPgDate(r.createdAt), toPgDate(r.updatedAt)
        ]
      );
    }
    console.log(`Imported ${reports.length} reports.`);

    // 9. Notifications
    const notifications = loadJson('notifications.json');
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications
         (id, user_id, type, title, body, is_read, linked_entity_id, linked_route, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [
          mapId(n._id), mapId(n.userId), n.type, n.title, n.body,
          n.isRead ?? false, n.linkedEntityId || '', n.linkedRoute || '',
          toPgDate(n.createdAt), toPgDate(n.updatedAt)
        ]
      );
    }
    console.log(`Imported ${notifications.length} notifications.`);

    // 10. Newsletters
    const newsletters = loadJson('newsletters.json');
    for (const n of newsletters) {
      await client.query(
        `INSERT INTO newsletters (id, email, created_at, updated_at)
         VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [mapId(n._id), n.email, toPgDate(n.createdAt), toPgDate(n.updatedAt)]
      );
    }
    console.log(`Imported ${newsletters.length} newsletters.`);

    console.log('\nMigration complete! All data has been imported to Neon.');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
