import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/AuthContext";
import { useAnnounceFeedback } from "../hooks/useAnnounceFeedback";

const AttendancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [rowStatuses, setRowStatuses] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [info, setInfo] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyEmployees, setMonthlyEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [monthlySummaryRows, setMonthlySummaryRows] = useState([]);
  const [monthlySummaryLoading, setMonthlySummaryLoading] = useState(false);
  useAnnounceFeedback({ error, success: info });

  const loadAttendance = async (date) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get(`/auth/attendance-sheet?date=${date}`);
      setData(response.data);
      const initialStatuses = {};
      (response.data.rows || []).forEach((row) => {
        initialStatuses[row.id] = row.status === "Not Marked" ? "Present" : row.status;
      });
      setRowStatuses(initialStatuses);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load attendance sheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(selectedDate);
  }, [selectedDate]);

  const loadMonthlyEmployees = async () => {
    try {
      const response = await apiClient.get("/auth/attendance/monthly/employees");
      const employees = response.data.employees || [];
      setMonthlyEmployees(employees);
      if (employees.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(String(employees[0].id));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load employees");
    }
  };

  const loadMonthlyAttendance = async (nextMonth, employeeIdValue) => {
    setMonthlyLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ month: nextMonth });
      if (isAdmin && employeeIdValue) {
        params.append("employee_id", employeeIdValue);
      }
      const response = await apiClient.get(`/auth/attendance/monthly?${params.toString()}`);
      setMonthlyData(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load monthly attendance");
    } finally {
      setMonthlyLoading(false);
    }
  };

  const loadMonthlySummary = async (nextMonth) => {
    if (!isAdmin) return;
    setMonthlySummaryLoading(true);
    try {
      const response = await apiClient.get(`/auth/attendance/monthly/summary?month=${nextMonth}`);
      setMonthlySummaryRows(response.data.rows || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load monthly summary");
    } finally {
      setMonthlySummaryLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin && !selectedEmployeeId) return;
    loadMonthlyAttendance(month, selectedEmployeeId);
    if (isAdmin) {
      loadMonthlySummary(month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedEmployeeId, isAdmin]);

  const handleMonthlyDownload = async (format) => {
    try {
      const params = new URLSearchParams({ month, format });
      if (isAdmin && selectedEmployeeId) {
        params.append("employee_id", selectedEmployeeId);
      }
      const response = await apiClient.get(`/auth/attendance/monthly/export?${params.toString()}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: format === "pdf" ? "application/pdf" : "text/csv",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const employeePart = monthlyData?.employee?.name || "employee";
      const ext = format === "pdf" ? "pdf" : "csv";
      link.href = url;
      link.download = `monthly-attendance-${employeePart}-${month}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to download report");
    }
  };

  const filteredRows = useMemo(() => {
    const rows = data?.rows || [];
    if (!query) return rows;
    const value = query.toLowerCase();
    return rows.filter(
      (row) => row.name.toLowerCase().includes(value) || row.department.toLowerCase().includes(value)
    );
  }, [data?.rows, query]);

  const handleMarkAttendance = async (userId) => {
    try {
      setSavingId(userId);
      setInfo("");
      await apiClient.post("/auth/attendance/mark", {
        user_id: userId,
        status: rowStatuses[userId] || "Present",
        attendance_date: selectedDate,
      });
      setInfo("Attendance updated successfully.");
      await loadAttendance(selectedDate);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update attendance");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardShell
      title="Attendance Overview"
      subtitle={`Daily attendance summary for ${data?.organization_name || "your organization"}.`}
      actions={
        <button className="btn-secondary" onClick={() => navigate("/dashboard")} type="button">
          Back to Dashboard
        </button>
      }
    >
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Employees" value={data?.summary?.total_employees ?? "-"} />
          <MetricCard label="Present Today" value={data?.summary?.present_today ?? "-"} />
          <MetricCard label="On Leave" value={data?.summary?.on_leave ?? "-"} />
          <MetricCard label="Late Marked" value={data?.summary?.late_marked ?? "-"} />
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Attendance Sheet</h2>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <label className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-gray-700">
                Date:
                <input
                  className="ml-2 bg-transparent text-gray-700 outline-none"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>
              <span className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1">
                Shift: {data?.shift || "General"}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <input
              className="input"
              placeholder="Search by employee or department"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {loading ? <p className="mt-3 text-sm text-gray-500">Loading attendance sheet...</p> : null}

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Check In</th>
                  <th className="px-3 py-2 font-medium">Check Out</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 text-gray-800 hover:bg-gray-50">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-gray-600">{row.department}</td>
                    <td className="px-3 py-2">{row.check_in}</td>
                    <td className="px-3 py-2">{row.check_out}</td>
                    <td className="px-3 py-2">
                      <span className={`status-pill ${statusClassName(row.status)}`}>{row.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                          value={rowStatuses[row.id] || "Present"}
                          onChange={(event) =>
                            setRowStatuses((prev) => ({ ...prev, [row.id]: event.target.value }))
                          }
                        >
                          <option value="Present">Present</option>
                          <option value="Late">Late</option>
                          <option value="Leave">Leave</option>
                        </select>
                        <button
                          className="btn-action"
                          disabled={savingId === row.id}
                          onClick={() => handleMarkAttendance(row.id)}
                          type="button"
                        >
                          {savingId === row.id ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={6}>
                      No attendance records found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Attendance</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input min-w-[170px]"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
              {isAdmin ? (
                <select
                  className="input min-w-[220px]"
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                >
                  {monthlyEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              ) : null}
              <button className="btn-secondary" onClick={() => handleMonthlyDownload("pdf")} type="button">
                Download PDF
              </button>
              <button className="btn-secondary" onClick={() => handleMonthlyDownload("excel")} type="button">
                Download Excel
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Present" value={monthlyData?.summary?.present ?? "-"} />
            <MetricCard label="Late" value={monthlyData?.summary?.late ?? "-"} />
            <MetricCard label="Absent" value={monthlyData?.summary?.absent ?? "-"} />
          </div>

          {monthlyLoading ? <p className="mt-3 text-sm text-gray-500">Loading monthly attendance...</p> : null}

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Check In</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(monthlyData?.rows || []).map((row) => (
                  <tr key={row.date} className="border-t border-gray-100 text-gray-800 hover:bg-gray-50">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.check_in}</td>
                    <td className="px-3 py-2">
                      <span className={`status-pill ${statusClassName(row.status)}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
                {!monthlyLoading && (monthlyData?.rows || []).length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={3}>
                      No monthly records found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        {isAdmin ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">All Employees Monthly Summary</h2>
              <span className="text-xs text-gray-500">Month: {month}</span>
            </div>
            {monthlySummaryLoading ? <p className="mt-3 text-sm text-gray-500">Loading summary...</p> : null}
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Employee</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Present</th>
                    <th className="px-3 py-2 font-medium">Late</th>
                    <th className="px-3 py-2 font-medium">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummaryRows.map((row) => (
                    <tr key={row.employee_id} className="border-t border-gray-100 text-gray-800 hover:bg-gray-50">
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 text-gray-600">{row.email}</td>
                      <td className="px-3 py-2">{row.present}</td>
                      <td className="px-3 py-2">{row.late}</td>
                      <td className="px-3 py-2">{row.absent}</td>
                    </tr>
                  ))}
                  {!monthlySummaryLoading && monthlySummaryRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={5}>
                        No summary records found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
    </DashboardShell>
  );
};

const statusClassName = (status) => {
  if (status === "Present") return "status-present";
  if (status === "Late") return "status-late";
  if (status === "Leave") return "status-leave";
  if (status === "Absent") return "status-absent";
  if (status === "Not Marked") return "status-unmarked";
  return "status-leave";
};

const MetricCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-blue-700">{value}</p>
  </div>
);

export default AttendancePage;
