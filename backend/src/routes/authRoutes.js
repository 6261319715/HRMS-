const express = require("express");
const { signup, login, profile, inviteSignup, updateProfile, changePassword } = require("../controllers/authController");
const {
  getDashboardOverview,
  getAttendanceSheet,
  markAttendance,
  getMonthlyAttendance,
  listMonthlyAttendanceEmployees,
  getMonthlyAttendanceSummary,
  exportMonthlyAttendance,
  generateInviteLink,
} = require("../controllers/dashboardController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { signupValidator, loginValidator, inviteSignupValidator } = require("../validators/authValidators");

const router = express.Router();

router.post("/signup", signupValidator, signup);
router.post("/invite-signup", inviteSignupValidator, inviteSignup);
router.post("/login", loginValidator, login);
router.get("/profile", authMiddleware, profile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/change-password", authMiddleware, changePassword);
router.get("/dashboard-overview", authMiddleware, requireRoles("admin"), getDashboardOverview);
router.get("/attendance-sheet", authMiddleware, getAttendanceSheet);
router.get("/attendance/monthly", authMiddleware, getMonthlyAttendance);
router.get("/attendance/monthly/employees", authMiddleware, listMonthlyAttendanceEmployees);
router.get("/attendance/monthly/summary", authMiddleware, requireRoles("admin"), getMonthlyAttendanceSummary);
router.get("/attendance/monthly/export", authMiddleware, exportMonthlyAttendance);
router.post("/attendance/mark", authMiddleware, requireRoles("admin"), markAttendance);
router.post("/invite-link", authMiddleware, requireRoles("admin"), generateInviteLink);

module.exports = router;
