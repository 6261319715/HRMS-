import { Link } from "react-router-dom";
import SectionMotion from "./SectionMotion";

const officeImage = "/images/office.png";

const HeroSection = () => {
  return (
    <SectionMotion className="relative overflow-hidden px-4 pt-16 pb-12 sm:px-6 lg:px-8" id="home">
      <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 bg-white p-8 shadow-xl sm:p-12">
        <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          MODERN SAAS HR
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-gray-900 sm:text-6xl">
          Staffly
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-blue-700 sm:text-base">
          Smart HR Management by IIFETECH PVT LTD
        </p>
        <p className="mt-4 max-w-2xl text-sm text-gray-600 sm:text-base">
          A clean, scalable platform to streamline HR tasks with fast onboarding and real-time visibility.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="btn-action px-5 py-2.5 text-sm" to="/signup">Start Free</Link>
          <a className="btn-secondary px-5 py-2.5 text-sm" href="#features">Explore Features</a>
        </div>
        <img
          alt="Team collaboration"
          className="mt-8 h-56 w-full rounded-2xl border border-gray-200 object-cover shadow-md sm:h-72"
          src={officeImage}
        />
      </div>
    </SectionMotion>
  );
};

export default HeroSection;
