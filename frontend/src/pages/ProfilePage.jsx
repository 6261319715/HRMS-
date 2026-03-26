import { useEffect, useState } from "react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/AuthContext";

const ProfilePage = () => {
  const { user, fetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await fetchProfile();
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell title="My Profile" subtitle="View your personal account details.">
      {error ? <p className="alert alert-error">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Loading profile...</p> : null}
      {!loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Name" value={user?.name} />
          <InfoCard label="Email" value={user?.email} />
          <InfoCard label="Mobile" value={user?.mobile_number} />
          <InfoCard label="Role" value={user?.role} />
          <InfoCard
            label="Joined"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
          />
          <InfoCard label="Organization" value={user?.organization_name} />
        </div>
      ) : null}
    </DashboardShell>
  );
};

const InfoCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-800">{value || "-"}</p>
  </div>
);

export default ProfilePage;
