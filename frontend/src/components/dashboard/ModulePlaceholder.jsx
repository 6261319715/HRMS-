import DashboardShell from "./DashboardShell";

const ModulePlaceholder = ({ title, subtitle }) => {
  return (
    <DashboardShell title={title} subtitle={subtitle}>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          This module screen is ready. You can now integrate real APIs, tables, and forms here.
        </p>
      </div>
    </DashboardShell>
  );
};

export default ModulePlaceholder;
