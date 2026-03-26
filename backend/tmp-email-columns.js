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
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_token varchar(255);
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamp;
    `);
    console.log('Email verification columns ensured');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
