const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { applyLeave, getMyLeaves, getAllLeaves, reviewLeave } = require("../controllers/leaveController");

const router = express.Router();

router.post("/apply", authMiddleware, requireRoles("employee", "admin"), applyLeave);
router.get("/my", authMiddleware, requireRoles("employee", "admin"), getMyLeaves);
router.get("/all", authMiddleware, requireRoles("admin"), getAllLeaves);
router.patch("/:id/review", authMiddleware, requireRoles("admin"), reviewLeave);

module.exports = router;
