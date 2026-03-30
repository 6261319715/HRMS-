const express = require("express");
const multer = require("multer");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { uploadDocument } = require("../middleware/uploadMiddleware");
const {
  getDocuments,
  uploadDocument: uploadDocumentController,
  deleteDocument,
} = require("../controllers/documentsController");

const router = express.Router();

router.get("/", authMiddleware, requireRoles("admin", "employee"), getDocuments);

router.post("/", authMiddleware, requireRoles("admin"), (req, res, next) => {
  uploadDocument.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size exceeds 2MB limit" });
    }
    return res.status(400).json({ message: err.message || "Invalid document upload" });
  });
}, uploadDocumentController);

router.delete("/:id", authMiddleware, requireRoles("admin"), deleteDocument);

module.exports = router;
