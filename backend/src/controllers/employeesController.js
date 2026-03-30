const { eq, desc, and } = require("drizzle-orm");
const { db } = require("../db");
const { users } = require("../db/schema");

const toEmployeeResponse = (employee) => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  department: employee.role === "admin" ? "Management" : "Operations",
  role: employee.role,
  join_date: employee.createdAt,
  status: employee.emailVerified || employee.isEmailVerified ? "Active" : "Inactive",
  mobile_number: employee.mobileNumber,
  avatar_url: null,
});

const getCurrentUser = async (userId) => {
  const currentUserRows = await db.select().from(users).where(eq(users.id, userId));
  return currentUserRows[0] || null;
};

const getEmployees = async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let orgUsers = [];
    if (req.user.role === "admin") {
      orgUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationName, currentUser.organizationName))
        .orderBy(desc(users.createdAt));
    } else {
      orgUsers = [currentUser];
    }

    return res.status(200).json({ employees: orgUsers.map(toEmployeeResponse) });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch employees", error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const employeeId = Number(req.params.id);
    if (!Number.isInteger(employeeId)) {
      return res.status(400).json({ message: "Invalid employee id" });
    }

    const employeeRows = await db
      .select()
      .from(users)
      .where(and(eq(users.id, employeeId), eq(users.organizationName, currentUser.organizationName)));

    if (employeeRows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { name, email, role, status, mobile_number } = req.body;
    const updates = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }
    if (typeof email === "string" && email.trim()) {
      updates.email = email.trim().toLowerCase();
    }
    if (typeof role === "string" && ["admin", "employee"].includes(role)) {
      updates.role = role;
    }
    if (typeof mobile_number === "string" && /^\d{10}$/.test(mobile_number)) {
      updates.mobileNumber = mobile_number;
    }
    if (status === "Active" || status === "Inactive") {
      const verified = status === "Active";
      updates.emailVerified = verified;
      updates.isEmailVerified = verified;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(and(eq(users.id, employeeId), eq(users.organizationName, currentUser.organizationName)))
      .returning();

    return res.status(200).json({
      message: "Employee updated successfully",
      employee: toEmployeeResponse(updated),
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not update employee", error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const employeeId = Number(req.params.id);
    if (!Number.isInteger(employeeId)) {
      return res.status(400).json({ message: "Invalid employee id" });
    }

    if (employeeId === currentUser.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const deletedRows = await db
      .delete(users)
      .where(and(eq(users.id, employeeId), eq(users.organizationName, currentUser.organizationName)))
      .returning({ id: users.id });

    if (deletedRows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete employee", error: error.message });
  }
};

module.exports = { getEmployees, updateEmployee, deleteEmployee };
