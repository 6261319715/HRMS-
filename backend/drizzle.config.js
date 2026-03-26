const dotenv = require("dotenv");
const { defineConfig } = require("drizzle-kit");

dotenv.config();

module.exports = defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
