const express = require("express");
const multer = require("multer");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { getEmployees, updateEmployee, deleteEmployee } = require("../controllers/employeesController");
const { uploadDocument } = require("../middleware/uploadMiddleware");
const {
  getEmployeeDocuments,
  uploadEmployeeDocument,
  deleteEmployeeDocument,
} = require("../controllers/documentsController");

const router = express.Router();

router.get("/employees", authMiddleware, requireRoles("admin", "employee"), getEmployees);
router.put("/employees/:id", authMiddleware, requireRoles("admin"), updateEmployee);
router.delete("/employees/:id", authMiddleware, requireRoles("admin"), deleteEmployee);
router.get("/employees/:employeeId/documents", authMiddleware, requireRoles("admin", "employee"), getEmployeeDocuments);
router.post("/employees/:employeeId/documents", authMiddleware, requireRoles("admin"), (req, res, next) => {
  uploadDocument.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size exceeds 2MB limit" });
    }
    return res.status(400).json({ message: err.message || "Invalid document upload" });
  });
}, uploadEmployeeDocument);
router.delete("/employees/:employeeId/documents/:id", authMiddleware, requireRoles("admin"), deleteEmployeeDocument);

module.exports = router;
