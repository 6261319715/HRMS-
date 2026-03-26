import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/90 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a className="leading-tight" href="#home">
          <p className="text-xl font-black tracking-tight text-blue-700">Staffly</p>
          <p className="text-[10px] text-gray-500 sm:text-xs">Smart HR Management by IIFETECH PVT LTD</p>
        </a>
        <div className="hidden items-center gap-5 text-sm text-gray-700 md:flex">
          <a className="hover:text-blue-700" href="#features">
            Features
          </a>
          <a className="hover:text-blue-700" href="#about">
            About
          </a>
          <a className="hover:text-blue-700" href="#stats">
            Stats
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link className="btn-secondary px-3 py-1.5 text-sm" to="/login">
            Login
          </Link>
          <Link className="btn-action px-3 py-1.5 text-sm" to="/signup">
            Signup
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
