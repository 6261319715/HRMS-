import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import apiClient from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

const MAX_FILE_SIZE_MB = 2;

const DocumentsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", file: null });

  const loadDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/documents");
      setDocuments(response.data.documents || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const validateUpload = () => {
    if (!form.name.trim()) return "Document name is required";
    if (!form.file) return "Please select a file";
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(form.file.type)) return "Only PDF, JPG, and PNG files are allowed";
    if (form.file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `File size must be <= ${MAX_FILE_SIZE_MB}MB`;
    return "";
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateUpload();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("file", form.file);
      await apiClient.post("/documents", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Document uploaded successfully");
      setForm({ name: "", file: null });
      await loadDocuments();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to upload document");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId) => {
    const ok = window.confirm("Delete this document?");
    if (!ok) return;
    setDeletingId(docId);
    setError("");
    setSuccess("");
    try {
      await apiClient.delete(`/documents/${docId}`);
      setSuccess("Document deleted successfully");
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardShell
      title="Documents"
      subtitle={isAdmin ? "Upload and manage organization documents." : "View and download organization documents."}
    >
      <div className="space-y-4">
        {error ? <p className="alert alert-error">{error}</p> : null}
        {success ? <p className="alert alert-success">{success}</p> : null}

        {isAdmin ? (
          <form className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" onSubmit={handleUpload}>
            <h3 className="text-sm font-semibold text-gray-900">Upload document</h3>
            <p className="mt-1 text-xs text-gray-500">Allowed: PDF, JPG, PNG (max {MAX_FILE_SIZE_MB}MB)</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                className="input md:col-span-1"
                placeholder="Document name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                className="input md:col-span-1"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
              />
              <button className="btn-action inline-flex items-center justify-center gap-2 md:col-span-1" type="submit" disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {submitting ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>Loading documents...</td>
                </tr>
              ) : null}
              {!loading && documents.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>No documents available</td>
                </tr>
              ) : null}
              {!loading
                ? documents.map((doc) => {
                    const ext = doc.mime_type === "application/pdf" ? "PDF" : doc.mime_type === "image/png" ? "PNG" : "JPG";
                    return (
                      <tr key={doc.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-600" />
                            <span className="font-medium text-gray-800">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{ext}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(doc.upload_date).toLocaleString()}</td>
                        <td className="px-4 py-3">
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
                                onClick={() => handleDelete(doc.id)}
                                type="button"
                                disabled={deletingId === doc.id}
                              >
                                <Trash2 size={14} />
                                {deletingId === doc.id ? "Deleting..." : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
};

export default DocumentsPage;
