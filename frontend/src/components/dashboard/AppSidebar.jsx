import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  User,
  Users,
  CalendarCheck,
  CalendarClock,
  Wallet,
  Settings,
  Bell,
  PanelLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const AppSidebar = ({ mobileOpen, setMobileOpen, desktopCollapsed, setDesktopCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || "employee";

  const menuSections = useMemo(
    () => [
      {
        key: "profile",
        label: "Profile",
        icon: User,
        items: [{ label: "My Profile", to: "/profile" }],
        roles: ["employee", "admin"],
      },
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        items: [
          { label: "Overview", to: "/dashboard" },
          { label: "Analytics", to: "/dashboard/analytics" },
        ],
        roles: ["admin"],
      },
      {
        key: "employees",
        label: "Employees",
        icon: Users,
        items: [
          { label: "All Employees", to: "/employees" },
          { label: "Teams", to: "/employees/teams" },
        ],
        roles: ["admin"],
      },
      {
        key: "attendance",
        label: "Attendance",
        icon: CalendarCheck,
        items: [
          { label: "Attendance Sheet", to: "/attendance" },
          { label: "Regularization", to: "/attendance/regularization" },
        ],
        roles: ["admin", "employee"],
      },
      {
        key: "leaves",
        label: "Leaves",
        icon: CalendarClock,
        items:
          role === "admin"
            ? [
                { label: "Manage requests", to: "/leaves" },
                { label: "Leave policy", to: "/leaves/policy" },
              ]
            : [{ label: "Apply leave", to: "/leaves" }],
        roles: ["admin", "employee"],
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: Bell,
        items: [{ label: "Inbox", to: "/notifications" }],
        roles: ["employee", "admin"],
      },
      {
        key: "payroll",
        label: "Payroll",
        icon: Wallet,
        items:
          role === "admin"
            ? [
                { label: "Salary runs", to: "/payroll" },
                { label: "Payslips", to: "/payroll/payslips" },
              ]
            : [{ label: "My payslips", to: "/payroll/payslips" }],
        roles: ["admin", "employee"],
      },
      {
        key: "settings",
        label: "Settings",
        icon: Settings,
        items: [
          { label: "Organization", to: "/settings" },
          { label: "Preferences", to: "/settings/preferences" },
        ],
        roles: ["admin"],
      },
    ],
    [role]
  );
  const visibleSections = menuSections.filter((section) => {
    if (!section.roles) return true;
    if (role === "employee") {
      return ["profile", "attendance", "leaves", "notifications", "payroll"].includes(section.key);
    }
    return section.roles.includes(role);
  });
  const activeKey = useMemo(() => {
    const section = visibleSections.find((entry) =>
      entry.items.some((item) => location.pathname === item.to)
    );
    return section?.key || visibleSections[0]?.key || "dashboard";
  }, [location.pathname, visibleSections]);
  const [openSections, setOpenSections] = useState(() => ({ [activeKey]: true }));

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sidebarBody = (
    <motion.aside
      className="h-full border-r border-gray-200 bg-white"
      animate={{ width: desktopCollapsed ? 88 : 280 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <div className={desktopCollapsed ? "hidden" : "block"}>
            <p className="text-lg font-black tracking-tight text-blue-600">Staffly</p>
            <p className="text-[10px] text-gray-500">SaaS Admin</p>
          </div>
          <button
            className="rounded-md border border-gray-200 p-1.5 text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            type="button"
          >
            {desktopCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => {
            const isSectionActive = section.key === activeKey;
            const Icon = section.icon;
            const isOpen = openSections[section.key] || (desktopCollapsed ? false : isSectionActive);

            return (
              <div key={section.key} className="rounded-xl">
                <button
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                    isSectionActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => toggleSection(section.key)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {!desktopCollapsed ? <span>{section.label}</span> : null}
                  </span>
                  {!desktopCollapsed ? <ChevronDown size={14} className={isOpen ? "rotate-180 transition" : "transition"} /> : null}
                </button>

                {!desktopCollapsed ? (
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 space-y-1 pl-2">
                          {section.items.map((item) => {
                            const active = location.pathname === item.to;
                            return (
                              <button
                                key={item.label}
                                className={`w-full rounded-lg px-3 py-1.5 text-left text-xs transition ${
                                  active
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                }`}
                                onClick={() => {
                                  navigate(item.to);
                                  setMobileOpen(false);
                                }}
                                type="button"
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </motion.aside>
  );

  return (
    <>
      <div className="hidden h-screen lg:block">{sidebarBody}</div>

      <div className="border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <PanelLeft size={16} />
          Menu
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              className="h-full w-72"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25 }}
              onClick={(event) => event.stopPropagation()}
            >
              {sidebarBody}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default AppSidebar;
