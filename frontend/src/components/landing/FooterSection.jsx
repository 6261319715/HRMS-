import SectionMotion from "./SectionMotion";

const FooterSection = () => {
  return (
    <SectionMotion className="px-4 pt-8 pb-10 sm:px-6 lg:px-8">
      <footer className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white px-5 py-5 text-center text-sm text-gray-600 shadow-sm">
        <p className="font-semibold text-gray-900">Staffly</p>
        <p className="mt-1 text-xs text-blue-700">Smart HR Management by IIFETECH PVT LTD</p>
        <p className="mt-1 text-xs text-gray-500">Employee Management · Attendance · Leave · Payroll</p>
      </footer>
    </SectionMotion>
  );
};

export default FooterSection;
