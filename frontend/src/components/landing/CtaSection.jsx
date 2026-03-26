import { Link } from "react-router-dom";
import SectionMotion from "./SectionMotion";

const CtaSection = () => {
  return (
    <SectionMotion className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 text-center shadow-xl sm:p-10">
        <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Ready to modernize your HR operations?</h2>
        <p className="mt-2 text-sm text-gray-600">Start your Staffly journey with secure onboarding and powerful workflows.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="btn-action px-5 py-2.5 text-sm" to="/signup">
            Create Account
          </Link>
          <Link className="btn-secondary px-5 py-2.5 text-sm" to="/login">
            Login
          </Link>
        </div>
      </div>
    </SectionMotion>
  );
};

export default CtaSection;
