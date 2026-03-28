import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Shield,
  User,
  Users,
} from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/AuthContext";

const SettingsPage = () => {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile().catch(() => {});
  }, [fetchProfile]);

  const orgName = user?.organization_name || user?.organizationName || "—";

  const links = [
    {
      label: "Team & roles",
      description: "Invite people, manage employees, and review access.",
      to: "/employees",
      icon: Users,
    },
    {
      label: "Leave requests",
      description: "Approve or reject leave and open the leave policy.",
      to: "/leaves",
      icon: CalendarClock,
    },
    {
      label: "Your profile & password",
      description: "Update contact details and change your password.",
      to: "/profile",
      icon: User,
    },
  ];

  return (
    <DashboardShell
      title="Organization settings"
      subtitle="Manage your workspace: company context, shortcuts, and security."
    >
      <div className="space-y-8">
        <section className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Organization</h2>
              <p className="mt-1 text-sm text-gray-600">
                Your Staffly workspace is tied to this company name. It appears on invites, leave flows, and reports.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800">
                <span className="text-gray-500">Name</span>
                {orgName}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Shortcuts</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <button
                    type="button"
                    onClick={() => navigate(item.to)}
                    className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <Icon className="mt-0.5 shrink-0 text-blue-600" size={20} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 font-medium text-gray-900">
                        {item.label}
                        <ArrowRight size={16} className="shrink-0 text-gray-400" />
                      </span>
                      <span className="mt-1 block text-xs text-gray-600">{item.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-amber-100 bg-amber-50/80 p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 shrink-0 text-amber-700" size={20} />
            <div>
              <h2 className="text-base font-semibold text-amber-900">Security</h2>
              <p className="mt-1 text-sm text-amber-900/80">
                Use a strong, unique password for this account. You can change it anytime under{" "}
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="font-medium text-amber-950 underline decoration-amber-600/80 underline-offset-2 hover:text-amber-950"
                >
                  My Profile
                </button>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};

export default SettingsPage;
