import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Search } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import apiClient from "../api/apiClient";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get("/employees");
        setEmployees(response.data.employees || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const departments = useMemo(() => {
    const unique = [...new Set(employees.map((employee) => employee.department))];
    return ["All", ...unique];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        query.length === 0 ||
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query);
      const matchesDepartment = departmentFilter === "All" || employee.department === departmentFilter;
      const matchesStatus = statusFilter === "All" || employee.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <DashboardShell title="All Employees" subtitle="Manage employee directory, roles, and workforce overview.">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="input"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
          </div>
        ) : null}

        {error ? <p className="alert alert-error">{error}</p> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Profile</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Join Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-t border-gray-100 text-gray-800 transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {employee.avatar_url ? (
                          <img
                            alt={employee.name}
                            className="h-9 w-9 rounded-full object-cover"
                            src={employee.avatar_url}
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {employee.name?.slice(0, 2)?.toUpperCase() || "NA"}
                          </div>
                        )}
                        <span className="font-medium">{employee.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{employee.email}</td>
                    <td className="px-4 py-3">{employee.department}</td>
                    <td className="px-4 py-3 capitalize">{employee.role}</td>
                    <td className="px-4 py-3">
                      {employee.join_date ? new Date(employee.join_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          employee.status === "Active"
                            ? "status-pill status-present"
                            : "status-pill status-inactive"
                        }
                      >
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActionButton icon={<Eye size={14} />} label="View" />
                        <ActionButton icon={<Pencil size={14} />} label="Edit" />
                        <ActionButton icon={<Trash2 size={14} />} label="Delete" danger />
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                      No Employees Found
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && filteredEmployees.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredEmployees.length)} of{" "}
              {filteredEmployees.length} employees
            </p>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                type="button"
              >
                Previous
              </button>
              <span className="text-xs text-gray-600">
                Page {currentPage} / {totalPages}
              </span>
              <button
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
};

const ActionButton = ({ icon, label, danger = false }) => (
  <button
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
      danger
        ? "border-red-800/80 text-red-300 hover:bg-red-900/20"
        : "border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    }`}
    type="button"
  >
    {icon}
    {label}
  </button>
);

export default EmployeesPage;
