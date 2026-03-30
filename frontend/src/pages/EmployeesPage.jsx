import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Search, RefreshCw, FileText, Download, Upload } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import apiClient from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const defaultEditForm = {
  name: "",
  email: "",
  role: "employee",
  status: "Active",
  mobile_number: "",
};

const EmployeesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [docForm, setDocForm] = useState({ name: "", file: null });

  const loadEmployees = async ({ withLoader = true } = {}) => {
    if (withLoader) setLoading(true);
    try {
      const response = await apiClient.get("/employees");
      setEmployees(response.data.employees || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load employees");
    } finally {
      if (withLoader) setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleView = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleEdit = (employee) => {
    setEditEmployee(employee);
    setEditForm({
      name: employee.name || "",
      email: employee.email || "",
      role: employee.role || "employee",
      status: employee.status || "Active",
      mobile_number: employee.mobile_number || "",
    });
  };

  const handleDelete = async (employeeId) => {
    if (!isAdmin) return;
    const ok = window.confirm("Are you sure you want to delete this employee?");
    if (!ok) return;

    setDeletingId(employeeId);
    try {
      await apiClient.delete(`/employees/${employeeId}`);
      toast.success("Employee deleted successfully.");
      await loadEmployees({ withLoader: false });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete employee");
    } finally {
      setDeletingId(null);
    }
  };

  const requestStatusChange = (employee) => {
    if (!isAdmin) return;
    if (employee.role === "admin") return;
    const nextStatus = employee.status === "Active" ? "Inactive" : "Active";
    setStatusConfirm({ employee, nextStatus });
  };

  const cancelStatusChange = () => {
    setStatusConfirm(null);
  };

  const confirmStatusChange = async () => {
    if (!statusConfirm) return;
    const { employee, nextStatus } = statusConfirm;
    setStatusConfirm(null);

    const previous = employees;
    setEmployees((prev) =>
      prev.map((e) => (e.id === employee.id ? { ...e, status: nextStatus } : e))
    );
    setStatusUpdatingId(employee.id);

    try {
      await apiClient.put(`/employees/${employee.id}`, { status: nextStatus });
      toast.success(`Status updated to ${nextStatus}.`);
    } catch (err) {
      setEmployees(previous);
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;
    if (!editEmployee) return;

    setSavingEdit(true);
    try {
      await apiClient.put(`/employees/${editEmployee.id}`, editForm);
      toast.success("Employee updated successfully.");
      setEditEmployee(null);
      await loadEmployees({ withLoader: false });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update employee");
    } finally {
      setSavingEdit(false);
    }
  };

  const openDocumentsModal = async (employee) => {
    setDocumentsTarget(employee);
    setDocForm({ name: "", file: null });
    setDocuments([]);
    setDocumentsLoading(true);
    try {
      const response = await apiClient.get(`/employees/${employee.id}/documents`);
      setDocuments(response.data.documents || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load employee documents");
    } finally {
      setDocumentsLoading(false);
    }
  };

  const validateDocumentInput = () => {
    if (!docForm.name.trim()) return "Document name is required";
    if (!docForm.file) return "Please choose a file";
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(docForm.file.type)) return "Only PDF, JPG, and PNG files are allowed";
    if (docForm.file.size > 2 * 1024 * 1024) return "File size exceeds 2MB limit";
    return "";
  };

  const handleUploadDocument = async (event) => {
    event.preventDefault();
    if (!isAdmin || !documentsTarget) return;
    const validationError = validateDocumentInput();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setUploadingDoc(true);
    try {
      const payload = new FormData();
      payload.append("name", docForm.name.trim());
      payload.append("file", docForm.file);
      await apiClient.post(`/employees/${documentsTarget.id}/documents`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const refreshed = await apiClient.get(`/employees/${documentsTarget.id}/documents`);
      setDocuments(refreshed.data.documents || []);
      toast.success("Document uploaded successfully.");
      setDocForm({ name: "", file: null });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!isAdmin || !documentsTarget) return;
    const ok = window.confirm("Delete this document?");
    if (!ok) return;
    setDeletingDocId(documentId);
    try {
      await apiClient.delete(`/employees/${documentsTarget.id}/documents/${documentId}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      toast.success("Document deleted successfully.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <DashboardShell
      title={isAdmin ? "All Employees" : "My Profile & Documents"}
      subtitle={isAdmin ? "Manage employee directory, roles, and workforce overview." : "View your profile and documents."}
    >
      <div className="space-y-4">
        <div className={`grid gap-3 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {isAdmin ? (
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
          ) : null}
          {isAdmin ? (
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
          </div>
        ) : null}

        {!loading ? (
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
                      {isAdmin ? (
                        <EmployeeStatusRow
                          employee={employee}
                          busy={statusUpdatingId === employee.id}
                          onToggle={() => requestStatusChange(employee)}
                        />
                      ) : (
                        <StatusBadge status={employee.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActionButton icon={<Eye size={14} />} label="View" onClick={() => handleView(employee)} />
                        <ActionButton icon={<FileText size={14} />} label="Docs" onClick={() => openDocumentsModal(employee)} />
                        {isAdmin ? (
                          <ActionButton icon={<Pencil size={14} />} label="Edit" onClick={() => handleEdit(employee)} />
                        ) : null}
                        {isAdmin ? (
                          <ActionButton
                            icon={<Trash2 size={14} />}
                            label={deletingId === employee.id ? "Deleting..." : "Delete"}
                            danger
                            disabled={deletingId === employee.id}
                            onClick={() => handleDelete(employee.id)}
                          />
                        ) : null}
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

        {!loading && filteredEmployees.length > 0 && isAdmin ? (
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

      {selectedEmployee ? (
        <Modal title="Employee Details" onClose={() => setSelectedEmployee(null)}>
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-medium text-gray-900">Name:</span> {selectedEmployee.name}</p>
            <p><span className="font-medium text-gray-900">Email:</span> {selectedEmployee.email}</p>
            <p><span className="font-medium text-gray-900">Role:</span> {selectedEmployee.role}</p>
            <p><span className="font-medium text-gray-900">Department:</span> {selectedEmployee.department}</p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900">Status:</span>
              <StatusBadge status={selectedEmployee.status} />
            </p>
            <p>
              <span className="font-medium text-gray-900">Joined:</span>{" "}
              {selectedEmployee.join_date ? new Date(selectedEmployee.join_date).toLocaleDateString() : "-"}
            </p>
            <p><span className="font-medium text-gray-900">Mobile:</span> {selectedEmployee.mobile_number || "-"}</p>
          </div>
        </Modal>
      ) : null}

      {statusConfirm ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            aria-label="Close dialog"
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] transition-opacity"
            onClick={cancelStatusChange}
            type="button"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl ring-1 ring-black/5 transition-all duration-200">
            <h3 className="text-lg font-semibold text-gray-900">Change employee status</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Are you sure you want to change status?
            </p>
            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="font-medium text-gray-900">{statusConfirm.employee.name}</span>
              <span className="mx-1.5 text-gray-400">→</span>
              <StatusBadge status={statusConfirm.nextStatus} />
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow"
                onClick={cancelStatusChange}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
                onClick={() => void confirmStatusChange()}
                type="button"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editEmployee ? (
        <Modal title="Edit Employee" onClose={() => setEditEmployee(null)}>
          <form className="space-y-3" onSubmit={handleEditSubmit}>
            <input
              className="input"
              placeholder="Name"
              value={editForm.name}
              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={editForm.email}
              onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Mobile number"
              maxLength={10}
              value={editForm.mobile_number}
              onChange={(event) => setEditForm((prev) => ({ ...prev, mobile_number: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="input"
                value={editForm.role}
                onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
              <select
                className="input"
                value={editForm.status}
                onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="btn-secondary px-3 py-2 text-sm" onClick={() => setEditEmployee(null)} type="button">
                Cancel
              </button>
              <button className="btn-action px-3 py-2 text-sm" disabled={savingEdit} type="submit">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {documentsTarget ? (
        <Modal
          title={`Documents: ${documentsTarget.name}`}
          onClose={() => {
            setDocumentsTarget(null);
            setDocuments([]);
          }}
        >
          <div className="space-y-4">
            {isAdmin ? (
              <form className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3" onSubmit={handleUploadDocument}>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    className="input md:col-span-1"
                    placeholder="Document name"
                    value={docForm.name}
                    onChange={(event) => setDocForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    className="input md:col-span-1"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => setDocForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
                  />
                  <button className="btn-action inline-flex items-center justify-center gap-2 md:col-span-1" type="submit" disabled={uploadingDoc}>
                    <Upload size={14} />
                    {uploadingDoc ? "Uploading..." : "Upload"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Allowed: PDF, JPG, PNG up to 2MB</p>
              </form>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">File URL</th>
                    <th className="px-3 py-2 font-medium">Upload Date</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsLoading ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={4}>Loading documents...</td>
                    </tr>
                  ) : null}
                  {!documentsLoading &&
                    documents.map((doc) => (
                      <tr key={doc.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">{doc.name}</td>
                        <td className="px-3 py-2">
                          <a className="text-blue-600 underline" href={doc.file_url} target="_blank" rel="noreferrer">
                            {doc.file_url}
                          </a>
                        </td>
                        <td className="px-3 py-2">{new Date(doc.upload_date).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <a
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download size={14} />
                              Download
                            </a>
                            {isAdmin ? (
                              <button
                                className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                                type="button"
                                disabled={deletingDocId === doc.id}
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                <Trash2 size={14} />
                                {deletingDocId === doc.id ? "Deleting..." : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!documentsLoading && documents.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={4}>No documents found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}
    </DashboardShell>
  );
};

const EmployeeStatusRow = ({ employee, onToggle, busy }) => {
  const isAdmin = employee.role === "admin";
  const isActive = employee.status === "Active";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={employee.status} />
      <button
        aria-busy={busy}
        aria-label={isActive ? "Set inactive" : "Set active"}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-600"
        disabled={isAdmin || busy}
        onClick={onToggle}
        title={isAdmin ? "Admin account status cannot be toggled here" : "Toggle Active / Inactive"}
        type="button"
      >
        {busy ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
        ) : (
          <span className="tabular-nums">{isActive ? "Deactivate" : "Activate"}</span>
        )}
      </button>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const active = status === "Active";
  return (
    <span
      className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200 ${
        active
          ? "bg-green-100 text-green-600 ring-1 ring-green-200/80"
          : "bg-red-100 text-red-500 ring-1 ring-red-200/80"
      }`}
    >
      {status}
    </span>
  );
};

const ActionButton = ({ icon, label, danger = false, onClick, disabled = false }) => (
  <button
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
      danger
        ? "border-red-800/80 text-red-300 hover:bg-red-900/20"
        : "border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    } disabled:cursor-not-allowed disabled:opacity-60`}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {icon}
    {label}
  </button>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose} type="button">
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default EmployeesPage;
