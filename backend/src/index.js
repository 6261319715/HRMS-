const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const documentsRoutes = require("./routes/documentsRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const normalizeOrigin = (value) => (value || "").replace(/\/$/, "").trim();

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowVercelApp =
  process.env.CORS_ALLOW_VERCEL === "true" || process.env.CORS_ALLOW_VERCEL === "1";
const vercelOriginPattern = /^https:\/\/[\w.-]+\.vercel\.app$/i;

const isLocalhostOrigin = (origin) => /^https?:\/\/localhost(?::\d+)?$/i.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (like curl/Postman) without Origin header.
      if (!origin) {
        return callback(null, true);
      }

      const normalized = normalizeOrigin(origin);

      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      if (allowVercelApp && vercelOriginPattern.test(normalized)) {
        return callback(null, true);
      }

      // In local development, Vite can shift ports (5173, 5174, 5175, ...).
      if (process.env.NODE_ENV !== "production" && isLocalhostOrigin(normalized)) {
        return callback(null, true);
      }

      // Avoid passing Error into cors — it can skip CORS headers on preflight and confuse the browser.
      // eslint-disable-next-line no-console
      console.warn(`CORS blocked for origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/health", (_req, res) => {
  res.status(200).json({ message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/documents", documentsRoutes);

const host = process.env.HOST || "0.0.0.0";
app.listen(PORT, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on ${host}:${PORT}`);
});
