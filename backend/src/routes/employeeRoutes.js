const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { getEmployees } = require("../controllers/employeesController");

const router = express.Router();

router.get("/employees", authMiddleware, requireRoles("admin"), getEmployees);

module.exports = router;
