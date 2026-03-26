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
      ADD COLUMN IF NOT EXISTS email_verification_token varchar(255),
      ADD COLUMN IF NOT EXISTS verified_at timestamp;
    `);
    console.log('Verification columns ensured in users table.');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
