import { useEffect, useState } from "react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/apiClient";

const ProfilePage = () => {
  const { user, fetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile_number: "" });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

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

  const openEditModal = () => {
    setEditForm({
      name: user?.name || "",
      mobile_number: user?.mobile_number || "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setInfo("");
    try {
      await apiClient.put("/auth/profile", editForm);
      await fetchProfile();
      setInfo("Profile updated successfully.");
      setEditOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setError("");
    setInfo("");
    try {
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        throw new Error("New password and confirm password do not match");
      }
      await apiClient.post("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setInfo("Password changed successfully.");
      setPasswordOpen(false);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const userInitial = (user?.name || "U").slice(0, 1).toUpperCase();

  return (
    <DashboardShell
      title="My Profile"
      subtitle="Manage your account details, security settings, and personal information."
      actions={
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary px-3 py-2 text-sm" onClick={() => setPasswordOpen(true)} type="button">
            Change Password
          </button>
          <button className="btn-action px-3 py-2 text-sm" onClick={openEditModal} type="button">
            Edit Profile
          </button>
        </div>
      }
    >
      {error ? <p className="alert alert-error">{error}</p> : null}
      {info ? <p className="alert alert-success">{info}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Loading profile...</p> : null}
      {!loading ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 shadow-sm">
                  {userInitial}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{user?.name || "-"}</h2>
                  <p className="text-sm text-gray-600">{user?.email || "-"}</p>
                  <RoleBadge role={user?.role} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <InfoCard label="Name" value={user?.name} />
            <InfoCard label="Email" value={user?.email} />
            <InfoCard label="Mobile" value={user?.mobile_number} />
            <InfoCard label="Role" value={<RoleBadge role={user?.role} />} />
            <InfoCard
              label="Joined"
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
            />
            <InfoCard label="Organization" value={user?.organization_name} />
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <Modal title="Edit Profile" onClose={() => setEditOpen(false)}>
          <form className="space-y-3" onSubmit={handleEditSubmit}>
            <input
              className="input"
              placeholder="Full name"
              value={editForm.name}
              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Mobile number"
              maxLength={10}
              value={editForm.mobile_number}
              onChange={(event) => setEditForm((prev) => ({ ...prev, mobile_number: event.target.value }))}
            />
            <div className="flex items-center justify-end gap-2">
              <button className="btn-secondary px-3 py-2 text-sm" onClick={() => setEditOpen(false)} type="button">
                Cancel
              </button>
              <button className="btn-action px-3 py-2 text-sm" disabled={savingProfile} type="submit">
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {passwordOpen ? (
        <Modal title="Change Password" onClose={() => setPasswordOpen(false)}>
          <form className="space-y-3" onSubmit={handlePasswordSubmit}>
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={passwordForm.current_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))
              }
            />
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={passwordForm.new_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))
              }
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirm_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))
              }
            />
            <div className="flex items-center justify-end gap-2">
              <button
                className="btn-secondary px-3 py-2 text-sm"
                onClick={() => setPasswordOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="btn-action px-3 py-2 text-sm" disabled={savingPassword} type="submit">
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </DashboardShell>
  );
};

const InfoCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <div className="mt-1 text-sm font-semibold text-gray-800">{value || "-"}</div>
  </div>
);

const RoleBadge = ({ role }) => (
  <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
    {role || "-"}
  </span>
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

export default ProfilePage;
