const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());
const isLocalhostOrigin = (origin) => /^https?:\/\/localhost(?::\d+)?$/i.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (like curl/Postman) without Origin header.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In local development, Vite can shift ports (5173, 5174, 5175, ...).
      if (process.env.NODE_ENV !== "production" && isLocalhostOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api", employeeRoutes);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
