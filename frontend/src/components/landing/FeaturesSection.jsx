import SectionMotion from "./SectionMotion";

const features = [
  { icon: "👤", title: "Employee Management", desc: "Manage employee records, roles, and profiles from one central place." },
  { icon: "🕒", title: "Attendance", desc: "Track daily check-ins, check-outs, late entries, and leaves easily." },
  { icon: "🏖️", title: "Leave Management", desc: "Review leave requests, balances, and approvals with clear workflows." },
  { icon: "💸", title: "Payroll", desc: "Prepare salary summaries and payroll-ready attendance insights quickly." },
];

const FeaturesSection = () => {
  return (
    <SectionMotion className="px-4 py-12 sm:px-6 lg:px-8" id="features">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-semibold text-gray-900 sm:text-3xl">Core Features</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Built for modern HR teams with clean workflows.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-2xl">{feature.icon}</p>
              <h3 className="mt-3 text-base font-semibold text-gray-800">{feature.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{feature.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionMotion>
  );
};

export default FeaturesSection;
