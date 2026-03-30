import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import apiClient from "../api/apiClient";
import { useNotifications } from "../context/NotificationContext";
import { useAnnounceFeedback } from "../hooks/useAnnounceFeedback";

const formatAgo = (iso) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { refreshUnread } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  useAnnounceFeedback({ error });

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.get("/notifications", { params: { limit: 80 } });
      setItems(res.data.notifications || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markOne = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await refreshUnread();
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await apiClient.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      await refreshUnread();
    } catch {
      /* ignore */
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <DashboardShell
      title="Notifications"
      subtitle="Leaves, attendance updates, and other activity."
      actions={
        items.length > 0 && unread > 0 ? (
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        ) : null
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50/80 px-4 py-8 text-center">
          <p className="text-sm font-medium text-red-900">Couldn&apos;t load notifications</p>
          <p className="mt-1 text-xs text-red-800/90">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="btn-action mt-4 inline-flex px-4 py-2 text-sm"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center">
          <Bell className="mx-auto mb-2 text-gray-400" size={28} />
          <p className="text-sm font-medium text-gray-700">You&apos;re all caught up</p>
          <p className="mt-1 text-xs text-gray-500">New alerts will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={async () => {
                if (!n.read) await markOne(n.id);
                if (n.link_path) navigate(n.link_path);
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left shadow-sm transition ${
                n.read
                  ? "border-gray-100 bg-white hover:border-gray-200"
                  : "border-blue-100 bg-blue-50/60 hover:border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm ${n.read ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>
                    {n.title}
                  </p>
                  {n.body ? <p className="mt-0.5 text-xs text-gray-600">{n.body}</p> : null}
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">{formatAgo(n.created_at)}</p>
                </div>
                {!n.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden /> : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </DashboardShell>
  );
};

export default NotificationsPage;
