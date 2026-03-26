import SectionMotion from "./SectionMotion";

const stats = [
  { label: "Employees Managed", value: "10K+" },
  { label: "Organizations", value: "500+" },
  { label: "Attendance Logs", value: "1M+" },
  { label: "Uptime", value: "99.9%" },
];

const StatsSection = () => {
  return (
    <SectionMotion className="px-4 py-12 sm:px-6 lg:px-8" id="stats">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-blue-700">{item.value}</p>
              <p className="mt-1 text-sm text-gray-600">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionMotion>
  );
};

export default StatsSection;
