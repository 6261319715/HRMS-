/**
 * Creates `leave_requests` when drizzle-kit push cannot run (non-TTY / prompts).
 * Usage: from backend folder, `npm run db:ensure-leaves`
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("sslmode=require"));

async function main() {
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env and add your Supabase connection string.");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "sql", "leave_requests.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(sql);
    // eslint-disable-next-line no-console
    console.log("OK: leave_requests table and indexes are in place (or already existed).");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to apply sql/leave_requests.sql:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
