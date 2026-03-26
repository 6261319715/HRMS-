require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_otp varchar(255),
      ADD COLUMN IF NOT EXISTS email_verification_otp_expires_at timestamp;
    `);
    console.log('OTP columns ensured in users table.');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
