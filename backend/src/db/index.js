const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");

const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("sslmode=require"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

const db = drizzle(pool);

module.exports = { db, pool };
