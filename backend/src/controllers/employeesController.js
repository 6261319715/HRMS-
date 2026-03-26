const { eq, desc } = require("drizzle-orm");
const { db } = require("../db");
const { users } = require("../db/schema");

const getEmployees = async (req, res) => {
  try {
    const currentUserRows = await db.select().from(users).where(eq(users.id, req.user.id));
    if (currentUserRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = currentUserRows[0];
    const orgUsers = await db
      .select()
      .from(users)
      .where(eq(users.organizationName, currentUser.organizationName))
      .orderBy(desc(users.createdAt));

    const employees = orgUsers.map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      department: employee.role === "admin" ? "Management" : "Operations",
      role: employee.role,
      join_date: employee.createdAt,
      status: employee.emailVerified || employee.isEmailVerified ? "Active" : "Inactive",
      avatar_url: null,
    }));

    return res.status(200).json({ employees });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch employees", error: error.message });
  }
};

module.exports = { getEmployees };
