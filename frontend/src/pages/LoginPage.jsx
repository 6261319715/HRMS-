import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    try {
      const response = await login(formData);
      const targetPath = response?.user?.role === "employee" ? "/attendance" : "/dashboard";
      navigate(targetPath);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <AuthLayout
      title="Staffly Login"
      subtitle="Sign in to manage your workforce."
      sideHeading="Welcome Back"
      sideDescription="Access your Staffly workspace to manage employees, monitor attendance, and streamline payroll operations."
      footer={
        <span>
          New admin?{" "}
          <Link className="font-medium text-blue-700 hover:text-blue-800" to="/signup">
            Create an account
          </Link>
        </span>
      }
    >
      {error ? <p className="alert alert-error mb-4">{error}</p> : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
        />
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
