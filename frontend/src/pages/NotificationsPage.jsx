import DashboardShell from "../components/dashboard/DashboardShell";

const notifications = [
  { id: 1, title: "Attendance updated", time: "2 mins ago" },
  { id: 2, title: "Leave request status changed", time: "1 hour ago" },
  { id: 3, title: "Profile details reviewed", time: "Yesterday" },
];

const NotificationsPage = () => {
  return (
    <DashboardShell title="Notifications" subtitle="Recent updates related to your account and activities.">
      <div className="space-y-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
          >
            <p className="text-sm font-medium text-gray-800">{item.title}</p>
            <p className="mt-1 text-xs text-gray-500">{item.time}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
};

export default NotificationsPage;
