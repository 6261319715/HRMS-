import SectionMotion from "./SectionMotion";

const officeImage = "/images/office.png";

const DashboardPreviewSection = () => {
  return (
    <SectionMotion className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard Preview</h2>
          <p className="mt-1 text-sm text-gray-600">A quick look at your daily HR operations.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <PreviewCard label="Employees" value="1,248" />
            <PreviewCard label="Present Today" value="1,102" />
            <PreviewCard label="Leaves" value="38" />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Attendance Trend</p>
              <div className="mt-3 h-28 rounded-lg bg-gradient-to-r from-blue-100 via-blue-200 to-indigo-200" />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Recent Activities</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li className="rounded-md bg-gray-100 px-3 py-2">New employee onboarded</li>
                <li className="rounded-md bg-gray-100 px-3 py-2">Leave request approved</li>
                <li className="rounded-md bg-gray-100 px-3 py-2">Payroll cycle generated</li>
              </ul>
            </div>
          </div>
          <img
            alt="HR analytics dashboard"
            className="mt-4 h-52 w-full rounded-xl border border-gray-200 object-cover shadow-sm sm:h-64"
            src={officeImage}
          />
        </div>
      </div>
    </SectionMotion>
  );
};

const PreviewCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-blue-700">{value}</p>
  </div>
);

export default DashboardPreviewSection;
