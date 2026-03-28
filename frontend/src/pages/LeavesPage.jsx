import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  CalendarClock,
  CalendarRange,
  ClipboardList,
  FileText,
  Inbox,
  Send,
  Sparkles,
  CheckCircle2,
  Loader2,
  User,
} from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/apiClient";

const LEAVE_TYPES = ["Casual", "Sick", "Annual", "Other"];

const initialForm = {
  leave_type: "Casual",
  start_date: "",
  end_date: "",
  reason: "",
};

const LeavesPage = () => {
  const { user, fetchProfile } = useAuth();
  const location = useLocation();
  const isPolicy = location.pathname === "/leaves/policy";
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [form, setForm] = useState(initialForm);
  const [myRequests, setMyRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [reviewingId, setReviewingId] = useState(null);
  const [adminTab, setAdminTab] = useState("team");

  const getAxiosErrorMessage = (err, fallback) =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  const loadMyLeaves = async () => {
    setLoading(true);
    setError("");
    try {
      await fetchProfile();
      const res = await apiClient.get("/leaves/my");
      setMyRequests(res.data.requests || []);
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Failed to load your leave data"));
    } finally {
      setLoading(false);
    }
  };

  const loadAdminDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      await fetchProfile();
      const [allRes, myRes] = await Promise.all([
        apiClient.get("/leaves/all"),
        apiClient.get("/leaves/my"),
      ]);
      setAllRequests(allRes.data.requests || []);
      setMyRequests(myRes.data.requests || []);
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Failed to load leave requests"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPolicy && isAdmin) {
      setLoading(false);
      return;
    }
    if (isAdmin && !isPolicy) {
      loadAdminDashboard();
    } else if (!isAdmin && !isPolicy) {
      loadMyLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isPolicy]);

  const handleApply = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setInfo("");
    try {
      await apiClient.post("/leaves/apply", {
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || undefined,
      });
      setInfo("Leave request submitted successfully.");
      setForm(initialForm);
      if (isAdmin) {
        await loadAdminDashboard();
      } else {
        await loadMyLeaves();
      }
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Could not submit leave request"));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAdminRows = useMemo(() => {
    if (filter === "all") return allRequests;
    return allRequests.filter((r) => r.status === filter);
  }, [allRequests, filter]);

  const adminStats = useMemo(() => {
    const pending = allRequests.filter((r) => r.status === "pending").length;
    const approved = allRequests.filter((r) => r.status === "approved").length;
    return { total: allRequests.length, pending, approved };
  }, [allRequests]);

  const handleReview = async (id, status) => {
    const ok = window.confirm(
      status === "approved" ? "Approve this leave request?" : "Reject this leave request?"
    );
    if (!ok) return;
    setReviewingId(id);
    setError("");
    setInfo("");
    try {
      await apiClient.patch(`/leaves/${id}/review`, { status });
      setInfo(`Request ${status}.`);
      await loadAdminDashboard();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Could not update request"));
    } finally {
      setReviewingId(null);
    }
  };

  if (isPolicy && isAdmin) {
    return (
      <DashboardShell
        title="Leave policy"
        subtitle="Guidelines for your organization — share with your team."
      >
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/80 to-white px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <FileText className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Organization policy</h3>
                <p className="mt-0.5 text-sm text-gray-600">
                  These points help keep leave requests consistent and fair.
                </p>
              </div>
            </div>
          </div>
          <ul className="space-y-0 divide-y divide-gray-100 px-6 py-2">
            {[
              "Submit leave requests at least 2 business days in advance when possible.",
              "Admins review and approve or reject requests for your organization.",
              "Plan around public holidays and weekends where applicable.",
              "Contact HR for exceptions or medical leave documentation.",
            ].map((line, i) => (
              <li key={i} className="flex gap-3 py-3.5 text-sm text-gray-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </DashboardShell>
    );
  }

  if (isPolicy && !isAdmin) {
    return <Navigate to="/leaves" replace />;
  }

  return (
    <DashboardShell
      title={isAdmin ? "Leave management" : "Leave requests"}
      subtitle={
        isAdmin
          ? "Review incoming requests and keep your team’s time off organized."
          : "Submit a new request and track approvals in one place."
      }
    >
      {error ? <p className="alert alert-error">{error}</p> : null}
      {info ? <p className="alert alert-success">{info}</p> : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-600">Loading leave data…</p>
        </div>
      ) : isAdmin ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">View</p>
            <div className="inline-flex w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-50/90 p-1 sm:w-auto">
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  adminTab === "team"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setAdminTab("team")}
                type="button"
              >
                <ClipboardList className="h-4 w-4 shrink-0" />
                Team requests
              </button>
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  adminTab === "mine"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setAdminTab("mine")}
                type="button"
              >
                <User className="h-4 w-4 shrink-0" />
                My leave
              </button>
            </div>
          </div>

          {adminTab === "mine" ? (
            <EmployeeLeaveSection
              applyHint="Your request appears in Team requests for another admin to approve, or adjust policy as needed."
              form={form}
              handleApply={handleApply}
              myRequests={myRequests}
              setForm={setForm}
              submitting={submitting}
            />
          ) : (
            <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill
              icon={<ClipboardList className="h-4 w-4" />}
              label="Total requests"
              value={adminStats.total}
              tone="default"
            />
            <StatPill
              icon={<Inbox className="h-4 w-4" />}
              label="Pending review"
              value={adminStats.pending}
              tone="amber"
            />
            <StatPill
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Approved"
              value={adminStats.approved}
              tone="green"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Filter by status</p>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "approved", "rejected"].map((key) => (
                <button
                  key={key}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-200 ${
                    filter === key
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : "border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-blue-200 hover:bg-blue-50/50"
                  }`}
                  onClick={() => setFilter(key)}
                  type="button"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-4 py-3">
              <ClipboardList className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">All requests</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-white text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAdminRows.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors duration-150 hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900">{row.applicant_name}</p>
                        <p className="text-xs text-gray-500">{row.applicant_email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                          {row.leave_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-700">
                        <span className="font-medium">{row.start_date}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="font-medium">{row.end_date}</span>
                      </td>
                      <td
                        className="max-w-[200px] truncate px-4 py-3.5 text-gray-600"
                        title={row.reason || ""}
                      >
                        {row.reason || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {row.status === "pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow disabled:opacity-50"
                              disabled={reviewingId === row.id}
                              onClick={() => handleReview(row.id, "approved")}
                              type="button"
                            >
                              {reviewingId === row.id ? "…" : "Approve"}
                            </button>
                            <button
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              disabled={reviewingId === row.id}
                              onClick={() => handleReview(row.id, "rejected")}
                              type="button"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredAdminRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-14 text-center" colSpan={6}>
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                          <Inbox className="h-10 w-10 text-gray-300" />
                          <p className="text-sm font-medium text-gray-700">No leave requests</p>
                          <p className="text-xs text-gray-500">Try another filter or check back later.</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      ) : (
        <EmployeeLeaveSection
          form={form}
          handleApply={handleApply}
          myRequests={myRequests}
          setForm={setForm}
          submitting={submitting}
        />
      )}
    </DashboardShell>
  );
};

const EmployeeLeaveSection = ({
  form,
  setForm,
  handleApply,
  submitting,
  myRequests,
  applyHint = "Filled details go to your organization admin for approval.",
}) => (
  <div className="grid gap-6 lg:grid-cols-5">
    <div className="lg:col-span-2">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-indigo-500" />
        <div className="p-6 pl-7">
          <div className="flex items-center gap-2 text-blue-700">
            <Send className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wide">New request</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">Apply for leave</h3>
          <p className="mt-1 text-sm text-gray-600">{applyHint}</p>
          <form className="mt-5 space-y-4" onSubmit={handleApply}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Leave type
              </label>
              <select
                className="input"
                value={form.leave_type}
                onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Start
                </label>
                <input
                  className="input"
                  required
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <CalendarRange className="h-3.5 w-3.5" />
                  End
                </label>
                <input
                  className="input"
                  required
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reason <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                className="input min-h-[96px] resize-y"
                placeholder="e.g. family event, medical, travel…"
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <button
              className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit request
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>

    <div className="lg:col-span-3">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/80 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">My requests</h3>
              <p className="text-xs text-gray-500">Latest submissions & status</p>
            </div>
          </div>
        </div>
        <div className="mt-4 max-h-[min(520px,70vh)] space-y-3 overflow-y-auto pr-1">
          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/80 py-12 text-center">
              <CalendarClock className="mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">No requests yet</p>
              <p className="mt-1 max-w-xs text-xs text-gray-500">
                Use the form to submit your first leave request.
              </p>
            </div>
          ) : (
            myRequests.map((req) => (
              <div
                key={req.id}
                className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-100 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        {req.leave_type}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs font-medium text-gray-600">
                        {req.start_date} → {req.end_date}
                      </span>
                    </div>
                    {req.reason ? (
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{req.reason}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

const StatPill = ({ icon, label, value, tone }) => {
  const tones = {
    default: "border-gray-100 bg-white",
    amber: "border-amber-100 bg-amber-50/80",
    green: "border-emerald-100 bg-emerald-50/80",
  };
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition hover:shadow-md ${tones[tone] || tones.default}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm ring-1 ring-gray-100">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold tabular-nums text-gray-900">{value}</p>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-amber-100 text-amber-800 ring-amber-200/80",
    approved: "bg-green-100 text-green-700 ring-green-200/80",
    rejected: "bg-red-100 text-red-600 ring-red-200/80",
  };
  const cls = styles[status] || "bg-gray-100 text-gray-700 ring-gray-200";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 transition-colors ${cls}`}
    >
      {status}
    </span>
  );
};

export default LeavesPage;
