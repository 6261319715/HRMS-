require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();
    const r = await client.query("select id, email, is_email_verified, created_at from public.users order by id desc limit 10");
    console.log(r.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end().catch(() => {});
  }
})();
