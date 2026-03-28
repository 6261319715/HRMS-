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

  const sqlPath = path.join(__dirname, "..", "sql", "payslips.sql");
  const migratePath = path.join(__dirname, "..", "sql", "payslips_migrate_v2.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const migrateSql = fs.readFileSync(migratePath, "utf8");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(sql);
    await pool.query(migrateSql);
    // eslint-disable-next-line no-console
    console.log("OK: payslips table + v2 columns are in place.");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to apply sql/payslips.sql:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
