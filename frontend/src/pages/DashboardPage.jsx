import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/apiClient";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAnnounceFeedback } from "../hooks/useAnnounceFeedback";

const DashboardPage = () => {
  const { user, fetchProfile, logout } = useAuth();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const navigate = useNavigate();
  useAnnounceFeedback({ error, success: info });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchProfile();
        const response = await apiClient.get("/auth/dashboard-overview");
        setOverview(response.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCopyInvite = async () => {
    setError("");
    setInfo("");
    try {
      const recipientEmail = window.prompt("Enter employee email for invite:");
      if (!recipientEmail) {
        return;
      }

      const response = await apiClient.post("/auth/invite-link", { email: recipientEmail });
      const inviteLink = response.data.inviteLink;
      await navigator.clipboard.writeText(inviteLink);
      setInfo("Invite email sent and link copied to clipboard.");
    } catch (err) {
      const message = err?.response?.data?.message || "Unable to send invite right now.";
      setError(message);
    }
  };

  return (
    <DashboardShell
      title="Staffly Dashboard"
      subtitle={`Welcome to ${overview?.organization_name || user?.organization_name || "your organization"}.`}
      actions={
        <button className="btn-secondary" onClick={onLogout} type="button">
          Logout
        </button>
      }
    >
        {loading ? <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p> : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Employees" value={overview?.kpis?.total_employees ?? "-"} hint="In organization" />
          <KpiCard label="Present Today" value={overview?.kpis?.present_today ?? "-"} hint="Active attendance" />
          <KpiCard label="Pending Leaves" value={overview?.kpis?.pending_leaves ?? "-"} hint="Requests awaiting approval" />
          <KpiCard label="Open Invites" value={overview?.kpis?.open_invites ?? "-"} hint="Share invite link" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <FeatureCard
            title="Invite Team Members"
            description="Send an invite to HR managers and employees so they can join your organization."
          >
            <p className="text-xs text-gray-500">
              Quick invite link: <span className="text-gray-700">Generated securely when you click copy</span>
            </p>
            <button className="btn-action mt-3" onClick={handleCopyInvite} type="button">
              Copy Invite Link
            </button>
          </FeatureCard>

          <FeatureCard
            title="Attendance"
            description="Track daily presence, leaves, and punctuality with one central attendance view."
          >
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <StatPill label="Present" value={overview?.attendance_stats?.present ?? "-"} />
              <StatPill label="Leave" value={overview?.attendance_stats?.leave ?? "-"} />
              <StatPill label="Late" value={overview?.attendance_stats?.late ?? "-"} />
            </div>
            <button className="btn-action mt-3" onClick={() => navigate("/attendance")} type="button">
              Open Attendance
            </button>
          </FeatureCard>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Today Snapshot</h3>
            <div className="mt-3 space-y-3">
              {(overview?.snapshot || []).map((row) => (
                <TimelineRow key={row.title} title={row.title} subtitle={row.subtitle} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Admin Profile</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p><span className="text-gray-500">Name:</span> {user?.name || "-"}</p>
              <p><span className="text-gray-500">Email:</span> {user?.email || "-"}</p>
              <p><span className="text-gray-500">Role:</span> {user?.role || "-"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Admin" value={user?.name} />
          <InfoCard label="Email" value={user?.email} />
          <InfoCard label="Mobile" value={user?.mobile_number} />
          <InfoCard label="Role" value={user?.role} />
          <InfoCard label="Joined" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ""} />
        </div>
    </DashboardShell>
  );
};

const KpiCard = ({ label, value, hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-blue-700">{value}</p>
    <p className="mt-1 text-xs text-gray-500">{hint}</p>
  </div>
);

const FeatureCard = ({ title, description, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    <p className="mt-1 text-sm text-gray-600">{description}</p>
    <div className="mt-3">{children}</div>
  </div>
);

const TimelineRow = ({ title, subtitle }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
    <p className="text-sm font-medium text-gray-800">{title}</p>
    <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>
  </div>
);

const StatPill = ({ label, value }) => (
  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
    <p className="text-lg font-bold text-blue-700">{value}</p>
    <p className="text-[11px] text-blue-600">{label}</p>
  </div>
);

const InfoCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-800">{value || "-"}</p>
  </div>
);

export default DashboardPage;
