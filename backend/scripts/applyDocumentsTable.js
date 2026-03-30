require("dotenv").config();
const { Client } = require("pg");

const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("sslmode=require"));

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

(async () => {
  try {
    await client.connect();
    await client.query(`
      create table if not exists public.documents (
        id serial primary key,
        organization_name varchar(255) not null,
        uploaded_by_user_id integer not null references public.users(id) on delete cascade,
        name varchar(255) not null,
        file_url varchar(1000) not null,
        storage_key varchar(500) not null unique,
        mime_type varchar(100) not null,
        size_bytes integer not null,
        created_at timestamp not null default now()
      );
    `);
    // eslint-disable-next-line no-console
    console.log("documents table ready");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("documents table migration failed", error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
