const crypto = require("crypto");
const { Resend } = require("resend");
const PDFDocument = require("pdfkit");
const { and, eq, desc, count, gte, lte } = require("drizzle-orm");
const { db } = require("../db");
const { users, attendanceRecords, leaveRequests } = require("../db/schema");
const { createInviteToken } = require("../services/inviteStore");
const { createNotification, safeNotify } = require("../services/notificationService");

const ALLOWED_STATUSES = ["Present", "Late", "Leave"];
const todayDate = () => new Date().toISOString().split("T")[0];
const checkInForStatus = (status) => (status === "Leave" ? "-" : status === "Late" ? "09:42 AM" : "09:08 AM");
const checkOutForStatus = (status) => (status === "Leave" ? "-" : status === "Late" ? "06:37 PM" : "06:18 PM");
const resolveFrontendBaseUrl = () => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.trim().replace(/\/$/, "");
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.trim().replace(/\/$/, "");
  if (process.env.CLIENT_URLS) {
    const first = process.env.CLIENT_URLS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)[0];
    if (first) return first.replace(/\/$/, "");
  }
  return "http://localhost:5173";
};

const getOrganizationUsers = async (organizationName) => {
  return db.select().from(users).where(eq(users.organizationName, organizationName)).orderBy(desc(users.createdAt));
};

const parseMonthInput = (monthInput) => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthInput || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
};

const toIsoDate = (date) => date.toISOString().split("T")[0];

const getMonthRange = ({ year, month }) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));
  return { start: toIsoDate(startDate), end: toIsoDate(endDate), daysInMonth: endDate.getUTCDate() };
};

const normalizeMonthlyStatus = (status) => {
  if (status === "Present" || status === "Late") return status;
  return "Absent";
};

const buildMonthlyRows = ({ year, month, daysInMonth, recordsMap }) => {
  const rows = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = toIsoDate(new Date(Date.UTC(year, month - 1, day)));
    const record = recordsMap.get(date);
    const status = normalizeMonthlyStatus(record?.status);
    rows.push({
      date,
      check_in: record?.checkIn || "-",
      status,
    });
  }
  return rows;
};

const getMonthlyAttendanceData = async ({ currentUser, targetUserId, monthInput }) => {
  const parsed = parseMonthInput(monthInput);
  if (!parsed) {
    return { error: "Invalid month format. Use YYYY-MM." };
  }
  const { year, month } = parsed;
  const { start, end, daysInMonth } = getMonthRange(parsed);

  const targetRows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, targetUserId), eq(users.organizationName, currentUser.organizationName)));
  if (targetRows.length === 0) {
    return { error: "Employee not found in your organization", status: 404 };
  }
  const targetUser = targetRows[0];

  const records = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.organizationName, currentUser.organizationName),
        eq(attendanceRecords.userId, targetUser.id),
        gte(attendanceRecords.attendanceDate, start),
        lte(attendanceRecords.attendanceDate, end)
      )
    )
    .orderBy(attendanceRecords.attendanceDate);

  const recordsMap = new Map(records.map((record) => [record.attendanceDate, record]));
  const rows = buildMonthlyRows({ year, month, daysInMonth, recordsMap });
  const summary = {
    present: rows.filter((row) => row.status === "Present").length,
    late: rows.filter((row) => row.status === "Late").length,
    absent: rows.filter((row) => row.status === "Absent").length,
  };

  return {
    data: {
      month: monthInput,
      employee: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
      summary,
      rows,
    },
  };
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

const getMonthlyAttendance = async (req, res) => {
  try {
    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentUser = foundUsers[0];

    const monthInput = req.query.month;
    const requestedEmployeeId = Number(req.query.employee_id);
    const targetUserId =
      req.user.role === "admin" && Number.isInteger(requestedEmployeeId) && requestedEmployeeId > 0
        ? requestedEmployeeId
        : req.user.id;

    const { data, error, status } = await getMonthlyAttendanceData({
      currentUser,
      targetUserId,
      monthInput,
    });
    if (error) return res.status(status || 400).json({ message: error });

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch monthly attendance", error: error.message });
  }
};

const listMonthlyAttendanceEmployees = async (req, res) => {
  try {
    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentUser = foundUsers[0];

    let rows = [];
    if (req.user.role === "admin") {
      rows = await db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.organizationName, currentUser.organizationName))
        .orderBy(users.name);
    } else {
      rows = [{ id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role }];
    }

    return res.status(200).json({ employees: rows });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch employees list", error: error.message });
  }
};

const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentUser = foundUsers[0];
    const parsed = parseMonthInput(req.query.month);
    if (!parsed) {
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM." });
    }
    const { start, end, daysInMonth } = getMonthRange(parsed);

    const orgUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.organizationName, currentUser.organizationName))
      .orderBy(users.name);

    const records = await db
      .select({
        userId: attendanceRecords.userId,
        attendanceDate: attendanceRecords.attendanceDate,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.organizationName, currentUser.organizationName),
          gte(attendanceRecords.attendanceDate, start),
          lte(attendanceRecords.attendanceDate, end)
        )
      );

    const byUser = new Map();
    for (const row of records) {
      const bucket = byUser.get(row.userId) || [];
      bucket.push(row);
      byUser.set(row.userId, bucket);
    }

    const rows = orgUsers.map((orgUser) => {
      const userRecords = byUser.get(orgUser.id) || [];
      const normalized = userRecords.map((record) => normalizeMonthlyStatus(record.status));
      const present = normalized.filter((status) => status === "Present").length;
      const late = normalized.filter((status) => status === "Late").length;
      const absent = Math.max(0, daysInMonth - present - late);
      return {
        employee_id: orgUser.id,
        name: orgUser.name,
        email: orgUser.email,
        role: orgUser.role,
        present,
        late,
        absent,
      };
    });

    return res.status(200).json({ month: req.query.month, rows });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch monthly attendance summary", error: error.message });
  }
};

const exportMonthlyAttendance = async (req, res) => {
  try {
    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentUser = foundUsers[0];
    const monthInput = req.query.month;
    const format = (req.query.format || "").toLowerCase();
    const requestedEmployeeId = Number(req.query.employee_id);
    const targetUserId =
      req.user.role === "admin" && Number.isInteger(requestedEmployeeId) && requestedEmployeeId > 0
        ? requestedEmployeeId
        : req.user.id;

    const { data, error, status } = await getMonthlyAttendanceData({
      currentUser,
      targetUserId,
      monthInput,
    });
    if (error) return res.status(status || 400).json({ message: error });

    const safeName = data.employee.name.replace(/[^\w.-]+/g, "_");
    if (format === "pdf") {
      const fileName = `monthly-attendance-${safeName}-${monthInput}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      const pdf = new PDFDocument({ margin: 40, size: "A4" });
      pdf.pipe(res);
      pdf.fontSize(14).text(`Monthly Attendance - ${data.employee.name}`);
      pdf.moveDown(0.3);
      pdf.fontSize(10).text(`Month: ${monthInput}`);
      pdf.moveDown(1);
      pdf.fontSize(10).text("Date", 40, pdf.y, { continued: true });
      pdf.text("Check-in", 170, pdf.y, { continued: true });
      pdf.text("Status", 330, pdf.y);
      pdf.moveDown(0.4);
      data.rows.forEach((row) => {
        pdf.text(row.date, 40, pdf.y, { continued: true });
        pdf.text(row.check_in, 170, pdf.y, { continued: true });
        pdf.text(row.status, 330, pdf.y);
      });
      pdf.moveDown(1);
      pdf.text(`Present: ${data.summary.present} | Late: ${data.summary.late} | Absent: ${data.summary.absent}`);
      pdf.end();
      return;
    }

    if (format === "excel") {
      const fileName = `monthly-attendance-${safeName}-${monthInput}.csv`;
      const lines = [
        "Date,Check-In,Status",
        ...data.rows.map((row) => `${row.date},${row.check_in},${row.status}`),
        "",
        `Summary,Present:${data.summary.present};Late:${data.summary.late};Absent:${data.summary.absent},`,
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.status(200).send(lines.join("\n"));
    }

    return res.status(400).json({ message: "Invalid format. Use pdf or excel." });
  } catch (error) {
    return res.status(500).json({ message: "Could not export monthly attendance", error: error.message });
  }
};

const generateInviteLink = async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!email) {
      return res.status(400).json({ message: "Recipient email is required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid recipient email" });
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
    const frontendBaseUrl = resolveFrontendBaseUrl();
    const inviteLink = `${frontendBaseUrl}/invite-signup?token=${encodeURIComponent(token)}`;

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

module.exports = {
  getDashboardOverview,
  getAttendanceSheet,
  markAttendance,
  getMonthlyAttendance,
  listMonthlyAttendanceEmployees,
  getMonthlyAttendanceSummary,
  exportMonthlyAttendance,
  generateInviteLink,
};
