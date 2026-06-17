const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const seedAdmin = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.connect();

    const email = process.argv[2] || 'admin@nafa3ni.com';
    const password = process.argv[3] || 'admin123456';

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (rows.length > 0) {
      console.log(`User ${email} already exists. Promoting to admin...`);
      await pool.query(
        'UPDATE users SET role = $1, is_verified = $2, updated_at = NOW() WHERE email = $3',
        ['admin', true, email]
      );
      console.log(`✅ Success: User ${email} has been promoted to Admin.`);
    } else {
      console.log(`Creating a new admin user (${email})...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await pool.query(
        `INSERT INTO users (name, email, password, role, is_verified)
         VALUES ($1, $2, $3, $4, $5)`,
        ['System Admin', email, hashedPassword, 'admin', true]
      );
      console.log(`✅ Success: Admin account created!`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

seedAdmin();
