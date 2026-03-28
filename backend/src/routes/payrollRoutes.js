const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const {
  listPayslipsForOrg,
  listMyPayslips,
  getPayslipById,
  createPayslip,
  updatePayslip,
  deletePayslip,
  getPayrollAnalytics,
  downloadPayslipPdf,
} = require("../controllers/payrollController");

const router = express.Router();

router.get("/analytics", authMiddleware, requireRoles("admin"), getPayrollAnalytics);
router.get("/payslips/:id/pdf", authMiddleware, downloadPayslipPdf);
router.get("/payslips/:id", authMiddleware, getPayslipById);
router.patch("/payslips/:id", authMiddleware, requireRoles("admin"), updatePayslip);
router.delete("/payslips/:id", authMiddleware, requireRoles("admin"), deletePayslip);
router.get("/payslips", authMiddleware, requireRoles("admin"), listPayslipsForOrg);
router.post("/payslips", authMiddleware, requireRoles("admin"), createPayslip);
router.get("/my", authMiddleware, listMyPayslips);

module.exports = router;
