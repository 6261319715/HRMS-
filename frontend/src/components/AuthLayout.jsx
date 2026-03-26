import { motion } from "framer-motion";

const officeImage = "/images/office.png";

const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  sideHeading = "Staffly",
  sideDescription = "A modern platform to simplify employee management, payroll, and attendance operations in one place.",
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl lg:min-h-[78vh] lg:flex-row">
        <motion.div
          className="order-1 flex w-full items-center justify-center p-6 sm:p-10 lg:order-2 lg:w-1/2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-5 text-sm text-gray-600">{footer}</div> : null}
          </div>
        </motion.div>

        <motion.aside
          className="order-2 flex w-full items-center border-t border-gray-200 bg-gradient-to-br from-blue-100 via-white to-indigo-100 p-6 sm:p-10 lg:order-1 lg:w-1/2 lg:border-t-0 lg:border-r lg:border-gray-200"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="max-w-lg">
            <h2 className="text-4xl font-black leading-tight tracking-tight text-gray-900 sm:text-5xl">{sideHeading}</h2>
            <p className="mt-2 text-sm font-medium text-blue-700 sm:text-base">Smart HR Management by IIFETECH PVT LTD</p>
            <p className="mt-3 text-sm leading-6 text-gray-700 sm:text-base">{sideDescription}</p>
            <img
              alt="HRMS workspace"
              className="mt-6 h-40 w-full rounded-2xl border border-blue-100 object-cover shadow-md"
              src={officeImage}
            />
          </div>
        </motion.aside>
      </div>
    </div>
  );
};

export default AuthLayout;
