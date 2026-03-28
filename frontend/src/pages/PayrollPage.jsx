import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/apiClient";

const formatInr = (amount) => {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount ?? "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
};

const initialForm = {
  user_id: "",
  pay_period: "",
  basic_salary: "",
  hra: "",
  bonus: "",
  deduction_amount: "",
  status: "unpaid",
  notes: "",
};

const PayrollPage = () => {
  const { user, fetchProfile } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const isPayslipsPath = location.pathname === "/payroll/payslips";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [analytics, setAnalytics] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadPayslips = useCallback(async () => {
    setError("");
    try {
      if (isAdmin) {
        const params = {};
        if (periodFilter) params.period = periodFilter;
        if (statusFilter) params.status = statusFilter;
        const res = await apiClient.get("/payroll/payslips", { params });
        setPayslips(res.data.payslips || []);
      } else {
        const res = await apiClient.get("/payroll/my");
        setPayslips(res.data.payslips || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load payslips");
    }
  }, [isAdmin, periodFilter, statusFilter]);

  const loadAnalytics = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.get("/payroll/analytics");
      setAnalytics(res.data.months || []);
    } catch {
      setAnalytics([]);
    }
  }, [isAdmin]);

  const loadEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.get("/employees");
      setEmployees(res.data.employees || []);
    } catch {
      setEmployees([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await fetchProfile().catch(() => {});
        if (cancelled) return;
        if (isAdmin) {
          await loadEmployees();
          await loadAnalytics();
        }
        if (cancelled) return;
        await loadPayslips();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfile, loadEmployees, loadAnalytics, loadPayslips, isAdmin]);

  const chartData = useMemo(() => {
    return [...analytics]
      .reverse()
      .map((m) => ({
        month: m.pay_period,
        net: Number(m.total_net) || 0,
        gross: Number(m.total_gross) || 0,
        paid: Number(m.paid_count) || 0,
        unpaid: Number(m.unpaid_count) || 0,
      }));
  }, [analytics]);

  const previewNet = useMemo(() => {
    const b = Number(form.basic_salary) || 0;
    const h = Number(form.hra) || 0;
    const bo = Number(form.bonus) || 0;
    const d = Number(form.deduction_amount) || 0;
    return (b + h + bo - d).toFixed(2);
  }, [form.basic_salary, form.hra, form.bonus, form.deduction_amount]);

  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    for (const p of payslips) {
      gross += Number(p.gross_total || 0) || 0;
      net += Number(p.net_amount) || 0;
    }
    return { gross, net, count: payslips.length };
  }, [payslips]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setInfo("");
    setError("");
    try {
      await apiClient.post("/payroll/payslips", {
        user_id: Number(form.user_id),
        pay_period: form.pay_period,
        basic_salary: form.basic_salary,
        hra: form.hra || "0",
        bonus: form.bonus || "0",
        deduction_amount: form.deduction_amount || "0",
        status: form.status,
        notes: form.notes || undefined,
      });
      setInfo("Payslip saved. Employee is notified.");
      setForm(initialForm);
      await loadPayslips();
      await loadAnalytics();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save payslip");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this payslip?")) return;
    setDeletingId(id);
    setError("");
    try {
      await apiClient.delete(`/payroll/payslips/${id}`);
      await loadPayslips();
      await loadAnalytics();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not delete");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadPdf = async (id) => {
    setPdfLoadingId(id);
    try {
      const res = await apiClient.get(`/payroll/payslips/${id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Could not download PDF");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const openEdit = async (id) => {
    setError("");
    try {
      const res = await apiClient.get(`/payroll/payslips/${id}`);
      const p = res.data.payslip;
      setEditId(id);
      setEditForm({
        basic_salary: p.basic_salary,
        hra: p.hra,
        bonus: p.bonus,
        deduction_amount: p.deduction_amount,
        status: p.status,
        notes: p.notes || "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load payslip");
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editId || !editForm) return;
    setEditSaving(true);
    setError("");
    try {
      await apiClient.patch(`/payroll/payslips/${editId}`, editForm);
      setEditId(null);
      setEditForm(null);
      await loadPayslips();
      await loadAnalytics();
      setInfo("Payslip updated.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not update");
    } finally {
      setEditSaving(false);
    }
  };

  if (!isAdmin && location.pathname === "/payroll") {
    return <Navigate to="/payroll/payslips" replace />;
  }

  const title = isAdmin ? (isPayslipsPath ? "Payslips" : "Payroll") : "My payslips";
  const subtitle = isAdmin
    ? "Salary components, approvals, and analytics — INR."
    : "Download your payslip PDF anytime.";

  return (
    <DashboardShell title={title} subtitle={subtitle}>
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {info ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{info}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={18} />
          Loading payroll…
        </div>
      ) : (
        <>
          {isAdmin && chartData.length > 0 ? (
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Net payroll by month</h3>
                <p className="mt-0.5 text-xs text-gray-500">Total net paid accross employees</p>
                <div className="mt-4 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v) => formatInr(v)}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                      />
                      <Bar dataKey="net" fill="#2563eb" radius={[6, 6, 0, 0]} name="Net" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Gross vs net trend</h3>
                <p className="mt-0.5 text-xs text-gray-500">Before and after deductions</p>
                <div className="mt-4 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip formatter={(v) => formatInr(v)} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                      <Legend />
                      <Line type="monotone" dataKey="gross" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Gross" />
                      <Line type="monotone" dataKey="net" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="Net" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="mb-8 grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Records</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{totals.count}</p>
              </div>
              <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Gross (filtered)</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">{formatInr(totals.gross)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Net (filtered)</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{formatInr(totals.net)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm ring-1 ring-slate-800/60">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Quick tip</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  Net = Basic + HRA + Bonus − Deductions. Mark Paid when salary is disbursed.
                </p>
              </div>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="mb-8 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white via-slate-50/50 to-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-600/25">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">Create payslip</h2>
                    <p className="text-sm text-gray-500">Select employee and enter salary components.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Preview net</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-900">{formatInr(previewNet)}</p>
                </div>
              </div>
              <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Employee</span>
                  <select
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.user_id}
                    onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                  >
                    <option value="">Choose employee…</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Pay period</span>
                  <input
                    required
                    type="month"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.pay_period}
                    onChange={(e) => setForm((f) => ({ ...f, pay_period: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Status</span>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Basic salary</span>
                  <input
                    required
                    inputMode="decimal"
                    placeholder="0"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.basic_salary}
                    onChange={(e) => setForm((f) => ({ ...f, basic_salary: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">HRA</span>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.hra}
                    onChange={(e) => setForm((f) => ({ ...f, hra: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Bonus</span>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.bonus}
                    onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
                  />
                </label>
                <label className="block text-sm md:col-span-2 lg:col-span-1">
                  <span className="font-medium text-gray-700">Deductions (PF, tax, etc.)</span>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.deduction_amount}
                    onChange={(e) => setForm((f) => ({ ...f, deduction_amount: e.target.value }))}
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium text-gray-700">Notes</span>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional"
                  />
                </label>
                <div className="flex items-end md:col-span-2 lg:col-span-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Wallet size={18} />}
                    Save payslip
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filters</span>
              <input
                type="month"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              />
              <select
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              {(periodFilter || statusFilter) && (
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    setPeriodFilter("");
                    setStatusFilter("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-slate-50/90">
                <tr>
                  {isAdmin ? (
                    <>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Employee
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Period</th>
                    </>
                  ) : (
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Period</th>
                  )}
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Basic</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">HRA</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Bonus</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Gross</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Ded.</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Net</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                  {isAdmin ? (
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
                  ) : (
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">PDF</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payslips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 10 : 9}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      No payslips match your filters.
                    </td>
                  </tr>
                ) : (
                  payslips.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50/80">
                      {isAdmin ? (
                        <>
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-gray-900">{p.employee_name || "—"}</p>
                            <p className="text-xs text-gray-500">{p.employee_email}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-gray-800">{p.pay_period}</td>
                        </>
                      ) : (
                        <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-gray-900">{p.pay_period}</td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-gray-800">{formatInr(p.basic_salary)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-gray-600">{formatInr(p.hra)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-gray-600">{formatInr(p.bonus)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-indigo-700">
                        {formatInr(p.gross_total)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-amber-700">{formatInr(p.deduction_amount)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-emerald-800">
                        {formatInr(p.net_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            p.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status === "paid" ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      {isAdmin ? (
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => downloadPdf(p.id)}
                              disabled={pdfLoadingId === p.id}
                              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                              title="Download PDF"
                            >
                              {pdfLoadingId === p.id ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(p.id)}
                              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-blue-300 hover:text-blue-700"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === p.id}
                              onClick={() => handleDelete(p.id)}
                              className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === p.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => downloadPdf(p.id)}
                            disabled={pdfLoadingId === p.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                          >
                            {pdfLoadingId === p.id ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                            PDF
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editId && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit payslip</h3>
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setEditForm(null);
                }}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Basic</span>
                <input
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.basic_salary}
                  onChange={(e) => setEditForm((f) => ({ ...f, basic_salary: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">HRA</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.hra}
                  onChange={(e) => setEditForm((f) => ({ ...f, hra: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Bonus</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.bonus}
                  onChange={(e) => setEditForm((f) => ({ ...f, bonus: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Deductions</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.deduction_amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, deduction_amount: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Status</span>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Notes</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setEditId(null);
                    setEditForm(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {editSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
};

export default PayrollPage;
