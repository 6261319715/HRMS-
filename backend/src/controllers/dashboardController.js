const crypto = require("crypto");
const { Resend } = require("resend");
const { and, eq, desc, count } = require("drizzle-orm");
const { db } = require("../db");
const { users, attendanceRecords, leaveRequests } = require("../db/schema");
const { createInviteToken } = require("../services/inviteStore");
const { createNotification, safeNotify } = require("../services/notificationService");

const ALLOWED_STATUSES = ["Present", "Late", "Leave"];
const todayDate = () => new Date().toISOString().split("T")[0];
const checkInForStatus = (status) => (status === "Leave" ? "-" : status === "Late" ? "09:42 AM" : "09:08 AM");
const checkOutForStatus = (status) => (status === "Leave" ? "-" : status === "Late" ? "06:37 PM" : "06:18 PM");

const getOrganizationUsers = async (organizationName) => {
  return db.select().from(users).where(eq(users.organizationName, organizationName)).orderBy(desc(users.createdAt));
};

const getRowsWithAttendance = async (organizationName, date) => {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      attendanceStatus: attendanceRecords.status,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
    })
    .from(users)
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.userId, users.id),
        eq(attendanceRecords.attendanceDate, date)
      )
    )
    .where(eq(users.organizationName, organizationName))
    .orderBy(desc(users.createdAt));
};

const getDashboardOverview = async (req, res) => {
  try {
    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = foundUsers[0];
    const rowsWithAttendance = await getRowsWithAttendance(currentUser.organizationName, todayDate());
    const attendanceRows = rowsWithAttendance.map((orgUser) => {
      const status = orgUser.attendanceStatus || "Not Marked";
      return {
        employee_id: orgUser.id,
        employee_name: orgUser.name,
        department: orgUser.role === "admin" ? "Management" : "Operations",
        status,
        check_in: orgUser.checkIn || checkInForStatus(status),
        check_out: orgUser.checkOut || checkOutForStatus(status),
      };
    });

    const presentCount = attendanceRows.filter((row) => row.status === "Present").length;
    const lateCount = attendanceRows.filter((row) => row.status === "Late").length;
    const leaveCount = attendanceRows.filter((row) => row.status === "Leave").length;
    const totalEmployees = rowsWithAttendance.length;

    const [pendingLeaveRow] = await db
      .select({ c: count() })
      .from(leaveRequests)
      .where(
        and(eq(leaveRequests.organizationName, currentUser.organizationName), eq(leaveRequests.status, "pending"))
      );
    const pendingLeaveRequests = Number(pendingLeaveRow?.c ?? 0);

    return res.status(200).json({
      organization_name: currentUser.organizationName,
      kpis: {
        total_employees: totalEmployees,
        present_today: presentCount,
        pending_leaves: pendingLeaveRequests,
        open_invites: Math.max(0, totalEmployees < 8 ? 8 - totalEmployees : 0),
      },
      attendance_stats: {
        present: presentCount,
        leave: leaveCount,
        late: lateCount,
      },
      snapshot: [
        {
          title: "Shift started",
          subtitle: "09:00 AM - General shift started",
        },
        {
          title: "Late check-in alert",
          subtitle: `${lateCount} employee(s) checked in after 09:30 AM`,
        },
        {
          title: "Leave approvals pending",
          subtitle: `${pendingLeaveRequests} leave request(s) awaiting your review`,
        },
      ],
      recent_members: rowsWithAttendance.slice(0, 5).map((orgUser) => ({
        id: orgUser.id,
        name: orgUser.name,
        email: orgUser.email,
        role: orgUser.role,
        created_at: orgUser.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch dashboard overview", error: error.message });
  }
};

const getAttendanceSheet = async (req, res) => {
  try {
    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = foundUsers[0];
    const selectedDate = req.query.date || todayDate();
    let rowsWithAttendance = await getRowsWithAttendance(currentUser.organizationName, selectedDate);
    if (req.user.role === "employee") {
      rowsWithAttendance = rowsWithAttendance.filter((row) => row.id === req.user.id);
    }
    const rows = rowsWithAttendance.map((orgUser) => {
      const status = orgUser.attendanceStatus || "Not Marked";
      return {
        id: orgUser.id,
        name: orgUser.name,
        department: orgUser.role === "admin" ? "Management" : "Operations",
        check_in: orgUser.checkIn || checkInForStatus(status),
        check_out: orgUser.checkOut || checkOutForStatus(status),
        status,
      };
    });

    return res.status(200).json({
      organization_name: currentUser.organizationName,
      date: selectedDate,
      shift: "General",
      summary: {
        total_employees: rows.length,
        present_today: rows.filter((row) => row.status === "Present").length,
        on_leave: rows.filter((row) => row.status === "Leave").length,
        late_marked: rows.filter((row) => row.status === "Late").length,
      },
      rows,
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch attendance sheet", error: error.message });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { user_id, status, attendance_date } = req.body;

    if (!user_id || !status) {
      return res.status(400).json({ message: "user_id and status are required" });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use Present, Late, or Leave" });
    }

    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentUser = foundUsers[0];
    const targetUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.id, Number(user_id)), eq(users.organizationName, currentUser.organizationName)));

    if (targetUsers.length === 0) {
      return res.status(404).json({ message: "Employee not found in your organization" });
    }

    const date = attendance_date || todayDate();
    const checkIn = checkInForStatus(status);
    const checkOut = checkOutForStatus(status);

    await db
      .insert(attendanceRecords)
      .values({
        userId: Number(user_id),
        organizationName: currentUser.organizationName,
        attendanceDate: date,
        status,
        checkIn,
        checkOut,
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.userId, attendanceRecords.attendanceDate],
        set: {
          status,
          checkIn,
          checkOut,
        },
      });

    const targetId = Number(user_id);
    if (targetId !== req.user.id) {
      await safeNotify(async () => {
        await createNotification({
          userId: targetId,
          organizationName: currentUser.organizationName,
          type: "attendance_marked",
          title: `Attendance: ${status}`,
          body: `${date} · Marked by ${currentUser.name}`,
          linkPath: "/attendance",
        });
      });
    }

    return res.status(200).json({ message: "Attendance updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not update attendance", error: error.message });
  }
};

const generateInviteLink = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Recipient email is required" });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ message: "RESEND_API_KEY is not configured" });
    }

    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentUser = foundUsers[0];

    const token = crypto.randomBytes(32).toString("hex");
    createInviteToken({ token, organizationName: currentUser.organizationName });
    const inviteLink = `http://localhost:5174/signup?token=${token}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: `You are invited to join ${currentUser.organizationName} on Staffly`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          <h2 style="margin-bottom: 8px;">You're Invited</h2>
          <p style="margin-top: 0; color: #475569;">
            You have been invited to join <strong>${currentUser.organizationName}</strong> on Staffly.
          </p>
          <a href="${inviteLink}" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
            Accept Invite
          </a>
          <p style="margin-top: 18px; font-size: 12px; color: #64748b;">
            If button does not work, copy this link: ${inviteLink}
          </p>
        </div>
      `,
    });

    // eslint-disable-next-line no-console
    console.log(inviteLink);
    return res.status(200).json({ token, inviteLink, message: "Invite email sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not generate invite link", error: error.message });
  }
};

module.exports = { getDashboardOverview, getAttendanceSheet, markAttendance, generateInviteLink };
