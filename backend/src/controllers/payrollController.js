const { eq, and, desc } = require("drizzle-orm");
const { db, pool } = require("../db");
const { users, payslips } = require("../db/schema");
const { createNotification, safeNotify } = require("../services/notificationService");
const { buildPayslipPdf } = require("../services/payrollPdf");

const getCurrentUser = async (userId) => {
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] || null;
};

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

const parseMoney = (raw, label) => {
  if (raw === undefined || raw === null || raw === "") {
    return { error: `${label} is required` };
  }
  const s = String(raw).trim();
  if (!MONEY_RE.test(s)) {
    return { error: `${label} must be a valid amount (up to 2 decimal places)` };
  }
  const n = Number(s);
  if (n < 0 || n > 999999999.99) {
    return { error: `${label} is out of range` };
  }
  return { value: n.toFixed(2) };
};

const parseMoneyOptional = (raw, label) => {
  if (raw === undefined || raw === null || raw === "") {
    return { value: "0.00" };
  }
  return parseMoney(raw, label);
};

const computeGross = (basic, hra, bonus) => {
  return (Number(basic) + Number(hra) + Number(bonus)).toFixed(2);
};

const computeNet = (basic, hra, bonus, deductions) => {
  const g = Number(basic) + Number(hra) + Number(bonus);
  const d = Number(deductions);
  return (g - d).toFixed(2);
};

const mapPayslipRow = (row, extra = {}) => {
  const gross = computeGross(row.basicSalary, row.hra, row.bonus);
  return {
    id: row.id,
    user_id: row.userId,
    pay_period: row.payPeriod,
    basic_salary: row.basicSalary,
    hra: row.hra,
    bonus: row.bonus,
    gross_total: gross,
    deduction_amount: row.deductionAmount,
    net_amount: row.netAmount,
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    created_at: row.createdAt,
    created_by: row.createdBy,
    ...extra,
  };
};

const listPayslipsForOrg = async (req, res) => {
  try {
    const admin = await getCurrentUser(req.user.id);
    if (!admin) return res.status(404).json({ message: "User not found" });

    const period = req.query.period ? String(req.query.period).trim() : null;
    const status = req.query.status ? String(req.query.status).trim() : null;

    const conditions = [eq(payslips.organizationName, admin.organizationName)];
    if (period) conditions.push(eq(payslips.payPeriod, period));
    if (status === "paid" || status === "unpaid") conditions.push(eq(payslips.status, status));

    const rows = await db
      .select({
        id: payslips.id,
        userId: payslips.userId,
        organizationName: payslips.organizationName,
        payPeriod: payslips.payPeriod,
        basicSalary: payslips.basicSalary,
        hra: payslips.hra,
        bonus: payslips.bonus,
        deductionAmount: payslips.deductionAmount,
        netAmount: payslips.netAmount,
        currency: payslips.currency,
        status: payslips.status,
        notes: payslips.notes,
        createdBy: payslips.createdBy,
        createdAt: payslips.createdAt,
        employeeName: users.name,
        employeeEmail: users.email,
      })
      .from(payslips)
      .innerJoin(users, eq(payslips.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(payslips.payPeriod), desc(payslips.createdAt));

    const list = rows.map((r) =>
      mapPayslipRow(
        {
          id: r.id,
          userId: r.userId,
          organizationName: r.organizationName,
          payPeriod: r.payPeriod,
          basicSalary: r.basicSalary,
          hra: r.hra,
          bonus: r.bonus,
          deductionAmount: r.deductionAmount,
          netAmount: r.netAmount,
          currency: r.currency,
          status: r.status,
          notes: r.notes,
          createdBy: r.createdBy,
          createdAt: r.createdAt,
        },
        {
          employee_name: r.employeeName,
          employee_email: r.employeeEmail,
        }
      )
    );

    return res.status(200).json({ payslips: list });
  } catch (error) {
    return res.status(500).json({ message: "Could not load payslips", error: error.message });
  }
};

const listMyPayslips = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const rows = await db
      .select()
      .from(payslips)
      .where(and(eq(payslips.userId, me.id), eq(payslips.organizationName, me.organizationName)))
      .orderBy(desc(payslips.payPeriod), desc(payslips.createdAt));

    return res.status(200).json({ payslips: rows.map((r) => mapPayslipRow(r)) });
  } catch (error) {
    return res.status(500).json({ message: "Could not load payslips", error: error.message });
  }
};

const getPayslipById = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid payslip id" });
    }

    const rows = await db
      .select({
        id: payslips.id,
        userId: payslips.userId,
        organizationName: payslips.organizationName,
        payPeriod: payslips.payPeriod,
        basicSalary: payslips.basicSalary,
        hra: payslips.hra,
        bonus: payslips.bonus,
        deductionAmount: payslips.deductionAmount,
        netAmount: payslips.netAmount,
        currency: payslips.currency,
        status: payslips.status,
        notes: payslips.notes,
        createdBy: payslips.createdBy,
        createdAt: payslips.createdAt,
        employeeName: users.name,
        employeeEmail: users.email,
      })
      .from(payslips)
      .innerJoin(users, eq(payslips.userId, users.id))
      .where(eq(payslips.id, id));

    if (rows.length === 0) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    const r = rows[0];
    if (r.organizationName !== me.organizationName) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (me.role !== "admin" && r.userId !== me.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({
      payslip: mapPayslipRow(
        {
          id: r.id,
          userId: r.userId,
          organizationName: r.organizationName,
          payPeriod: r.payPeriod,
          basicSalary: r.basicSalary,
          hra: r.hra,
          bonus: r.bonus,
          deductionAmount: r.deductionAmount,
          netAmount: r.netAmount,
          currency: r.currency,
          status: r.status,
          notes: r.notes,
          createdBy: r.createdBy,
          createdAt: r.createdAt,
        },
        {
          employee_name: r.employeeName,
          employee_email: r.employeeEmail,
        }
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not load payslip", error: error.message });
  }
};

const buildPayloadFromBody = (body, { partial } = { partial: false }) => {
  const {
    user_id,
    pay_period,
    basic_salary,
    hra,
    bonus,
    deduction_amount,
    status,
    notes,
  } = body;

  if (!partial) {
    if (!user_id || !pay_period || basic_salary === undefined || basic_salary === null) {
      return { error: "user_id, pay_period, and basic_salary are required" };
    }
    if (!/^\d{4}-\d{2}$/.test(String(pay_period).trim())) {
      return { error: "pay_period must be YYYY-MM" };
    }
  }

  const basic = partial && basic_salary === undefined ? null : parseMoney(basic_salary, "basic_salary");
  if (basic && basic.error) return { error: basic.error };
  const h = parseMoneyOptional(hra !== undefined ? hra : "0", "hra");
  if (h.error) return { error: h.error };
  const b = parseMoneyOptional(bonus !== undefined ? bonus : "0", "bonus");
  if (b.error) return { error: b.error };
  const ded = parseMoneyOptional(
    deduction_amount !== undefined && deduction_amount !== null && deduction_amount !== ""
      ? deduction_amount
      : "0",
    "deduction_amount"
  );
  if (ded.error) return { error: ded.error };

  const bv = basic ? basic.value : null;
  const hv = h.value;
  const bonv = b.value;
  const dedv = ded.value;

  if (!partial || basic_salary !== undefined) {
    const g = computeGross(bv, hv, bonv);
    const dnum = Number(dedv);
    if (dnum > Number(g)) {
      return { error: "Deductions cannot exceed gross earnings (basic + HRA + bonus)" };
    }
  }

  let st = status;
  if (st !== undefined && st !== null && st !== "") {
    if (st !== "paid" && st !== "unpaid") {
      return { error: "status must be paid or unpaid" };
    }
  } else {
    st = undefined;
  }

  return {
    user_id: user_id !== undefined ? Number(user_id) : undefined,
    pay_period: pay_period !== undefined ? String(pay_period).trim() : undefined,
    basic: bv,
    hra: hv,
    bonus: bonv,
    deduction: dedv,
    status: st,
    notes: typeof notes === "string" ? notes.slice(0, 500) : notes === null ? null : undefined,
  };
};

const createPayslip = async (req, res) => {
  try {
    const admin = await getCurrentUser(req.user.id);
    if (!admin) return res.status(404).json({ message: "User not found" });

    const payload = buildPayloadFromBody(req.body, { partial: false });
    if (payload.error) {
      return res.status(400).json({ message: payload.error });
    }

    const net = computeNet(payload.basic, payload.hra, payload.bonus, payload.deduction);

    const targetId = Number(payload.user_id);
    if (!Number.isInteger(targetId)) {
      return res.status(400).json({ message: "Invalid user_id" });
    }

    const targetRows = await db
      .select()
      .from(users)
      .where(and(eq(users.id, targetId), eq(users.organizationName, admin.organizationName)));

    if (targetRows.length === 0) {
      return res.status(404).json({ message: "Employee not found in your organization" });
    }

    const [inserted] = await db
      .insert(payslips)
      .values({
        userId: targetId,
        organizationName: admin.organizationName,
        payPeriod: payload.pay_period,
        basicSalary: payload.basic,
        hra: payload.hra,
        bonus: payload.bonus,
        deductionAmount: payload.deduction,
        netAmount: net,
        currency: "INR",
        status: payload.status || "unpaid",
        notes: payload.notes ?? null,
        createdBy: admin.id,
      })
      .returning();

    await safeNotify(async () => {
      await createNotification({
        userId: targetId,
        organizationName: admin.organizationName,
        type: "payslip_ready",
        title: `Payslip for ${payload.pay_period}`,
        body: `Net pay ${net} INR — ${inserted.status === "paid" ? "Paid" : "Unpaid"}`,
        linkPath: "/payroll/payslips",
      });
    });

    return res.status(201).json({
      message: "Payslip recorded",
      payslip: mapPayslipRow(inserted, {
        employee_name: targetRows[0].name,
        employee_email: targetRows[0].email,
      }),
    });
  } catch (error) {
    if (error?.code === "23505" || /unique/i.test(error?.message || "")) {
      return res.status(409).json({ message: "A payslip for this employee and month already exists" });
    }
    return res.status(500).json({ message: "Could not create payslip", error: error.message });
  }
};

const updatePayslip = async (req, res) => {
  try {
    const admin = await getCurrentUser(req.user.id);
    if (!admin) return res.status(404).json({ message: "User not found" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid payslip id" });
    }

    const existingRows = await db
      .select()
      .from(payslips)
      .where(and(eq(payslips.id, id), eq(payslips.organizationName, admin.organizationName)));

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    const cur = existingRows[0];
    const body = req.body;

    const basic =
      body.basic_salary !== undefined ? parseMoney(body.basic_salary, "basic_salary") : { value: cur.basicSalary };
    if (basic.error) return res.status(400).json({ message: basic.error });

    const h = body.hra !== undefined ? parseMoneyOptional(body.hra, "hra") : { value: cur.hra };
    if (h.error) return res.status(400).json({ message: h.error });

    const b = body.bonus !== undefined ? parseMoneyOptional(body.bonus, "bonus") : { value: cur.bonus };
    if (b.error) return res.status(400).json({ message: b.error });

    const ded =
      body.deduction_amount !== undefined
        ? parseMoneyOptional(body.deduction_amount, "deduction_amount")
        : { value: cur.deductionAmount };
    if (ded.error) return res.status(400).json({ message: ded.error });

    const gross = computeGross(basic.value, h.value, b.value);
    if (Number(ded.value) > Number(gross)) {
      return res.status(400).json({ message: "Deductions cannot exceed gross earnings" });
    }

    const net = computeNet(basic.value, h.value, b.value, ded.value);

    let nextStatus = cur.status;
    if (body.status !== undefined) {
      if (body.status !== "paid" && body.status !== "unpaid") {
        return res.status(400).json({ message: "status must be paid or unpaid" });
      }
      nextStatus = body.status;
    }

    const nextNotes =
      body.notes !== undefined ? (typeof body.notes === "string" ? body.notes.slice(0, 500) : null) : cur.notes;

    const [updated] = await db
      .update(payslips)
      .set({
        basicSalary: basic.value,
        hra: h.value,
        bonus: b.value,
        deductionAmount: ded.value,
        netAmount: net,
        status: nextStatus,
        notes: nextNotes,
      })
      .where(and(eq(payslips.id, id), eq(payslips.organizationName, admin.organizationName)))
      .returning();

    const emp = await getCurrentUser(updated.userId);

    return res.status(200).json({
      message: "Payslip updated",
      payslip: mapPayslipRow(updated, {
        employee_name: emp?.name,
        employee_email: emp?.email,
      }),
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not update payslip", error: error.message });
  }
};

const deletePayslip = async (req, res) => {
  try {
    const admin = await getCurrentUser(req.user.id);
    if (!admin) return res.status(404).json({ message: "User not found" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid payslip id" });
    }

    const deleted = await db
      .delete(payslips)
      .where(and(eq(payslips.id, id), eq(payslips.organizationName, admin.organizationName)))
      .returning({ id: payslips.id });

    if (deleted.length === 0) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    return res.status(200).json({ message: "Payslip removed" });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete payslip", error: error.message });
  }
};

const getPayrollAnalytics = async (req, res) => {
  try {
    const admin = await getCurrentUser(req.user.id);
    if (!admin) return res.status(404).json({ message: "User not found" });

    const result = await pool.query(
      `SELECT pay_period,
              COALESCE(SUM(net_amount::numeric), 0)::text AS total_net,
              COALESCE(SUM(basic_salary::numeric + hra::numeric + bonus::numeric), 0)::text AS total_gross,
              COUNT(*)::int AS record_count,
              COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
              COUNT(*) FILTER (WHERE status = 'unpaid')::int AS unpaid_count
       FROM payslips
       WHERE organization_name = $1
       GROUP BY pay_period
       ORDER BY pay_period DESC
       LIMIT 36`,
      [admin.organizationName]
    );

    return res.status(200).json({ months: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Could not load analytics", error: error.message });
  }
};

const downloadPayslipPdf = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid payslip id" });
    }

    const rows = await db
      .select({
        id: payslips.id,
        userId: payslips.userId,
        organizationName: payslips.organizationName,
        payPeriod: payslips.payPeriod,
        basicSalary: payslips.basicSalary,
        hra: payslips.hra,
        bonus: payslips.bonus,
        deductionAmount: payslips.deductionAmount,
        netAmount: payslips.netAmount,
        currency: payslips.currency,
        status: payslips.status,
        notes: payslips.notes,
        employeeName: users.name,
        employeeEmail: users.email,
      })
      .from(payslips)
      .innerJoin(users, eq(payslips.userId, users.id))
      .where(eq(payslips.id, id));

    if (rows.length === 0) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    const r = rows[0];
    if (r.organizationName !== me.organizationName) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (me.role !== "admin" && r.userId !== me.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const grossTotal = computeGross(r.basicSalary, r.hra, r.bonus);
    const buf = await buildPayslipPdf({
      organizationName: r.organizationName,
      employeeName: r.employeeName,
      employeeEmail: r.employeeEmail,
      payPeriod: r.payPeriod,
      basicSalary: r.basicSalary,
      hra: r.hra,
      bonus: r.bonus,
      deductionAmount: r.deductionAmount,
      grossTotal,
      netAmount: r.netAmount,
      currency: r.currency,
      status: r.status,
      notes: r.notes,
    });

    const filename = `payslip-${r.payPeriod}-${id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buf);
  } catch (error) {
    return res.status(500).json({ message: "Could not generate PDF", error: error.message });
  }
};

module.exports = {
  listPayslipsForOrg,
  listMyPayslips,
  getPayslipById,
  createPayslip,
  updatePayslip,
  deletePayslip,
  getPayrollAnalytics,
  downloadPayslipPdf,
};
