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
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "sql", "payslips_migrate_v2.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(sql);
    // eslint-disable-next-line no-console
    console.log("OK: payslips v2 migration applied (basic/HRA/bonus/status).");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
