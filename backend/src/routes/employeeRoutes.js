const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { getEmployees, updateEmployee, deleteEmployee } = require("../controllers/employeesController");

const router = express.Router();

router.get("/employees", authMiddleware, requireRoles("admin"), getEmployees);
router.put("/employees/:id", authMiddleware, requireRoles("admin"), updateEmployee);
router.delete("/employees/:id", authMiddleware, requireRoles("admin"), deleteEmployee);

module.exports = router;
