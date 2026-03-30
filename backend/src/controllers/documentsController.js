const fs = require("fs/promises");
const path = require("path");
const { and, desc, eq } = require("drizzle-orm");
const { db } = require("../db");
const { documents, users } = require("../db/schema");

const getCurrentUser = async (userId) => {
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] || null;
};

const buildPublicFileUrl = (req, fileName) => {
  const configured = process.env.PUBLIC_BACKEND_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return `${configured}/uploads/documents/${encodeURIComponent(fileName)}`;
  }
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || req.protocol || "http";
  return `${protocol}://${req.get("host")}/uploads/documents/${encodeURIComponent(fileName)}`;
};

const getStorageKeyFromFilePath = (filePath) => path.basename(filePath);

const mapDocument = (row) => ({
  id: row.id,
  name: row.name,
  file_url: row.fileUrl,
  upload_date: row.createdAt,
  uploaded_by_user_id: row.uploadedByUserId,
  mime_type: row.mimeType,
  size_bytes: row.sizeBytes,
});

const getDocuments = async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.organizationName, currentUser.organizationName))
      .orderBy(desc(documents.createdAt));

    return res.status(200).json({ documents: rows.map(mapDocument) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
};

const uploadDocument = async (req, res) => {
  let uploadedFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Document file is required" });
    }

    uploadedFilePath = req.file.path;
    const displayName = (req.body?.name || req.file.originalname || "").trim();
    if (!displayName) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(400).json({ message: "Document name is required" });
    }

    const currentUser = await getCurrentUser(req.user.id);
    if (!currentUser) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(404).json({ message: "User not found" });
    }

    const storageKey = getStorageKeyFromFilePath(req.file.filename || req.file.path);
    const fileUrl = buildPublicFileUrl(req, req.file.filename);

    const inserted = await db
      .insert(documents)
      .values({
        organizationName: currentUser.organizationName,
        uploadedByUserId: currentUser.id,
        name: displayName,
        fileUrl,
        storageKey,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      })
      .returning();

    return res.status(201).json({
      message: "Document uploaded successfully",
      document: mapDocument(inserted[0]),
    });
  } catch (error) {
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(() => {});
    }
    return res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ message: "Invalid document id" });
    }

    const currentUser = await getCurrentUser(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const found = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.organizationName, currentUser.organizationName)));

    if (found.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.organizationName, currentUser.organizationName)));

    const filePath = path.resolve(process.cwd(), "uploads", "documents", found[0].storageKey);
    await fs.unlink(filePath).catch(() => {});

    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete document", error: error.message });
  }
};

module.exports = { getDocuments, uploadDocument, deleteDocument };
