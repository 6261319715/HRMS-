import SectionMotion from "./SectionMotion";

const AboutSection = () => {
  return (
    <SectionMotion className="px-4 py-12 sm:px-6 lg:px-8" id="about">
      <div className="mx-auto grid max-w-6xl gap-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:grid-cols-2 sm:p-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">About Staffly</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Staffly simplifies daily HR operations through a modern web interface. From onboarding to attendance and payroll
            insights, everything stays organized in one scalable system.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm text-blue-800">
            Built with a modular architecture so teams can add custom modules, workflows, and reports as they grow.
          </p>
        </div>
      </div>
    </SectionMotion>
  );
};

export default AboutSection;
