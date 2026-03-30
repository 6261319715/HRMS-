const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MIME_TO_EXT = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const uploadDir = path.resolve(process.cwd(), "uploads", "documents");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || path.extname(file.originalname).toLowerCase() || "";
    const unique = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Only PDF, JPG, and PNG files are allowed"));
  }
  return cb(null, true);
};

const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter,
});

module.exports = {
  uploadDocument,
  MAX_UPLOAD_BYTES,
  ALLOWED_MIME_TYPES,
  uploadDir,
};
