const { Resend } = require("resend");
const { eq, and, desc } = require("drizzle-orm");
const { db } = require("../db");
const { users, leaveRequests } = require("../db/schema");
const { createNotification, notifyOrganizationAdmins, safeNotify } = require("../services/notificationService");

const leaveTableMissingMessage =
  "Database table `leave_requests` is missing. In Supabase: open SQL Editor and run the script from `backend/sql/leave_requests.sql`, or from the backend folder run `npm run db:push` (in a normal terminal).";

/** Drizzle often wraps pg errors: top message is "Failed query: ..." while code/message live on `cause`. */
const walkErrorChain = (error) => {
  const list = [];
  let e = error;
  for (let i = 0; i < 8 && e; i++) {
    list.push(e);
    e = e.cause;
  }
  return list;
};

const fullErrorText = (error) =>
  walkErrorChain(error)
    .map((e) => e?.message || "")
    .filter(Boolean)
    .join(" | ");

const isLeaveTableMissingError = (error) => {
  const msg = fullErrorText(error) || String(error);
  if (!/leave_requests/i.test(msg)) {
    return false;
  }
  const chain = walkErrorChain(error);
  if (chain.some((e) => e?.code === "42P01")) {
    return true;
  }
  return /does not exist/i.test(msg);
};

const respondLeaveDbError = (res, error, defaultMessage) => {
  const detail = fullErrorText(error) || error?.message || String(error);
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error("[leaves]", defaultMessage, detail);
  }
  if (isLeaveTableMissingError(error)) {
    return res.status(503).json({ message: leaveTableMissingMessage, error: detail });
  }
  return res.status(500).json({ message: defaultMessage, error: detail });
};

const getCurrentUser = async (userId) => {
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] || null;
};

/** Best-effort: does not throw; logs on failure. Requires RESEND_API_KEY (same as invite emails). */
const sendLeaveReviewEmail = async ({
  toEmail,
  applicantName,
  organizationName,
  leaveType,
  startDate,
  endDate,
  status,
  reviewerName,
}) => {
  if (!process.env.RESEND_API_KEY || !toEmail) {
    return;
  }
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const isApproved = status === "approved";
  const subject = isApproved
    ? `Leave approved — ${leaveType} (${startDate} to ${endDate})`
    : `Leave request not approved — ${leaveType} (${startDate} to ${endDate})`;
  const headline = isApproved ? "Your leave was approved" : "Your leave request was not approved";
  const detail = isApproved
    ? `<p>Your manager has <strong>approved</strong> this leave.</p>`
    : `<p>Your manager has <strong>rejected</strong> this leave request.</p>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; color: #0f172a;">
          <p style="margin: 0 0 8px;">Hi ${applicantName || "there"},</p>
          <h2 style="margin: 0 0 12px;">${headline}</h2>
          <p style="margin: 0 0 16px; color: #475569;">${organizationName}</p>
          ${detail}
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Type</td><td style="padding: 6px 0;"><strong>${leaveType}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Dates</td><td style="padding: 6px 0;"><strong>${startDate}</strong> → <strong>${endDate}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Reviewed by</td><td style="padding: 6px 0;">${reviewerName}</td></tr>
          </table>
          <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">This is an automated message from Staffly.</p>
        </div>
      `,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[leaves] sendLeaveReviewEmail failed:", err?.message || err);
  }
};

const parseISODate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const applyLeave = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const { leave_type, start_date, end_date, reason } = req.body;
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ message: "leave_type, start_date, and end_date are required" });
    }

    const start = parseISODate(start_date);
    const end = parseISODate(end_date);
    if (!start || !end || start > end) {
      return res.status(400).json({ message: "Invalid date range (use YYYY-MM-DD, start ≤ end)" });
    }

    const allowedTypes = ["Casual", "Sick", "Annual", "Other"];
    if (!allowedTypes.includes(leave_type)) {
      return res.status(400).json({ message: `leave_type must be one of: ${allowedTypes.join(", ")}` });
    }

    const [inserted] = await db
      .insert(leaveRequests)
      .values({
        userId: me.id,
        organizationName: me.organizationName,
        leaveType: leave_type,
        startDate: start_date,
        endDate: end_date,
        reason: typeof reason === "string" ? reason.slice(0, 2000) : null,
        status: "pending",
      })
      .returning();

    if (!inserted) {
      return res.status(500).json({ message: "Could not submit leave request (no row returned)" });
    }

    await safeNotify(async () => {
      await notifyOrganizationAdmins({
        organizationName: me.organizationName,
        excludeUserId: me.id,
        type: "leave_submitted",
        title: `New leave request from ${me.name}`,
        body: `${leave_type}: ${start_date} → ${end_date}`,
        linkPath: "/leaves",
      });
    });

    return res.status(201).json({
      message: "Leave request submitted",
      request: mapLeaveRow(inserted, { applicantName: me.name, applicantEmail: me.email }),
    });
  } catch (error) {
    return respondLeaveDbError(res, error, "Could not submit leave request");
  }
};

const mapLeaveRow = (row, extra = {}) => ({
  id: row.id,
  user_id: row.userId,
  organization_name: row.organizationName,
  leave_type: row.leaveType,
  start_date: row.startDate,
  end_date: row.endDate,
  reason: row.reason,
  status: row.status,
  reviewed_by: row.reviewedBy,
  reviewed_at: row.reviewedAt,
  created_at: row.createdAt,
  ...extra,
});

const getMyLeaves = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const rows = await db
      .select()
      .from(leaveRequests)
      .where(and(eq(leaveRequests.userId, me.id), eq(leaveRequests.organizationName, me.organizationName)))
      .orderBy(desc(leaveRequests.createdAt));

    return res.status(200).json({ requests: rows.map((r) => mapLeaveRow(r)) });
  } catch (error) {
    return respondLeaveDbError(res, error, "Could not fetch leave requests");
  }
};

const getAllLeaves = async (req, res) => {
  try {
    const admin = await getCurrentUser(req.user.id);
    if (!admin) return res.status(404).json({ message: "User not found" });

    const rows = await db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        organizationName: leaveRequests.organizationName,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        reviewedBy: leaveRequests.reviewedBy,
        reviewedAt: leaveRequests.reviewedAt,
        createdAt: leaveRequests.createdAt,
        applicantName: users.name,
        applicantEmail: users.email,
        applicantRole: users.role,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .where(eq(leaveRequests.organizationName, admin.organizationName))
      .orderBy(desc(leaveRequests.createdAt));

    const requests = rows.map((r) =>
      mapLeaveRow(
        {
          id: r.id,
          userId: r.userId,
          organizationName: r.organizationName,
          leaveType: r.leaveType,
          startDate: r.startDate,
          endDate: r.endDate,
          reason: r.reason,
          status: r.status,
          reviewedBy: r.reviewedBy,
          reviewedAt: r.reviewedAt,
          createdAt: r.createdAt,
        },
        {
          applicant_name: r.applicantName,
          applicant_email: r.applicantEmail,
          applicant_role: r.applicantRole,
        }
      )
    );

    return res.status(200).json({ requests });
  } catch (error) {
    return respondLeaveDbError(res, error, "Could not fetch leave requests");
  }
};

const reviewLeave = async (req, res) => {
  try {
    const admin = await getCurrentUser(req.user.id);
    if (!admin) return res.status(404).json({ message: "User not found" });

    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const { status } = req.body;
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ message: "status must be approved or rejected" });
    }

    const existing = await db
      .select()
      .from(leaveRequests)
      .where(and(eq(leaveRequests.id, requestId), eq(leaveRequests.organizationName, admin.organizationName)));

    if (existing.length === 0) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (existing[0].status !== "pending") {
      return res.status(400).json({ message: "Request is already reviewed" });
    }

    const [updated] = await db
      .update(leaveRequests)
      .set({
        status,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      })
      .where(and(eq(leaveRequests.id, requestId), eq(leaveRequests.organizationName, admin.organizationName)))
      .returning();

    const applicant = await getCurrentUser(existing[0].userId);
    if (applicant) {
      await sendLeaveReviewEmail({
        toEmail: applicant.email,
        applicantName: applicant.name,
        organizationName: admin.organizationName,
        leaveType: updated.leaveType,
        startDate: updated.startDate,
        endDate: updated.endDate,
        status,
        reviewerName: admin.name,
      });
      await safeNotify(async () => {
        await createNotification({
          userId: applicant.id,
          organizationName: admin.organizationName,
          type: "leave_reviewed",
          title: status === "approved" ? "Leave approved" : "Leave request not approved",
          body: `${updated.leaveType} (${updated.startDate} – ${updated.endDate})`,
          linkPath: "/leaves",
        });
      });
    }

    return res.status(200).json({
      message: `Leave ${status}`,
      request: mapLeaveRow(updated),
    });
  } catch (error) {
    return respondLeaveDbError(res, error, "Could not update leave request");
  }
};

module.exports = { applyLeave, getMyLeaves, getAllLeaves, reviewLeave };
