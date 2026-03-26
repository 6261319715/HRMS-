import { useState } from "react";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../../context/AuthContext";

const DashboardShell = ({ title, subtitle, actions, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <AppSidebar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          desktopCollapsed={desktopCollapsed}
          setDesktopCollapsed={setDesktopCollapsed}
        />

        <main className="w-full">
          <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
              <button
                className="rounded-md border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                onClick={() => navigate("/notifications")}
                type="button"
              >
                <Bell size={16} />
              </button>

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
          </div>

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
                </div>
                {actions ? <div>{actions}</div> : null}
              </div>
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
