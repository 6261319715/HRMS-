import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Loader2, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import apiClient from "../../api/apiClient";

const formatAgoShort = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const DashboardShell = ({ title, subtitle, actions, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellLoading, setBellLoading] = useState(false);
  const [bellItems, setBellItems] = useState([]);
  const bellRef = useRef(null);
  const { user, logout } = useAuth();
  const { unreadCount, refreshUnread } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    let cancelled = false;
    (async () => {
      setBellLoading(true);
      try {
        const res = await apiClient.get("/notifications", { params: { limit: 8 } });
        if (!cancelled) setBellItems(res.data.notifications || []);
      } catch {
        if (!cancelled) setBellItems([]);
      } finally {
        if (!cancelled) setBellLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bellOpen]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 lg:h-dvh lg:max-h-dvh lg:flex-row lg:overflow-hidden">
      <AppSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        desktopCollapsed={desktopCollapsed}
        setDesktopCollapsed={setDesktopCollapsed}
      />

      <main className="flex min-h-0 min-w-0 w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-2">
              <div className="relative" ref={bellRef}>
                <button
                  className="relative rounded-md border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                  onClick={() => setBellOpen((o) => !o)}
                  type="button"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                {bellOpen ? (
                  <div className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notifications</p>
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setBellOpen(false);
                          navigate("/notifications");
                        }}
                      >
                        View all
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {bellLoading ? (
                        <div className="flex justify-center py-6 text-gray-400">
                          <Loader2 className="animate-spin" size={20} />
                        </div>
                      ) : bellItems.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-gray-500">No notifications yet</p>
                      ) : (
                        bellItems.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className={`flex w-full gap-2 border-b border-gray-50 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50 ${
                              n.read ? "" : "bg-blue-50/40"
                            }`}
                            onClick={async () => {
                              if (!n.read) {
                                try {
                                  await apiClient.patch(`/notifications/${n.id}/read`);
                                  await refreshUnread();
                                } catch {
                                  /* ignore */
                                }
                              }
                              setBellOpen(false);
                              if (n.link_path) navigate(n.link_path);
                              else navigate("/notifications");
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm ${n.read ? "text-gray-700" : "font-medium text-gray-900"}`}>
                                {n.title}
                              </p>
                              {n.body ? <p className="truncate text-xs text-gray-500">{n.body}</p> : null}
                            </div>
                            <span className="shrink-0 text-[10px] text-gray-400">{formatAgoShort(n.created_at)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:border-blue-300"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  type="button"
                >
                  <User size={14} />
                  <span className="max-w-[130px] truncate">{user?.name || "Profile"}</span>
                  <ChevronDown size={14} />
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                    <div className="border-b border-gray-100 px-2 pb-2">
                      <p className="text-sm font-medium text-gray-800">{user?.name || "-"}</p>
                      <p className="text-xs text-gray-500">{user?.email || "-"}</p>
                    </div>
                    <button
                      className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/profile");
                      }}
                      type="button"
                    >
                      <User size={14} />
                      My Profile
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                      onClick={onLogout}
                      type="button"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
                  {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
              </div>
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardShell;
