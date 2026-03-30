import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/AuthLayout";
import { validateLoginForm } from "../utils/authFormValidation";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const { toast } = useToast();
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = {
      email: formData.email.trim(),
      password: formData.password,
    };
    const validation = validateLoginForm(trimmed);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      return;
    }
    setFieldErrors({});

    try {
      const response = await login(trimmed);
      toast.success("Signed in successfully.");
      const targetPath = response?.user?.role === "employee" ? "/attendance" : "/dashboard";
      navigate(targetPath);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      const validationErrors = err?.response?.data?.errors;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        const next = {};
        for (const item of validationErrors) {
          if (item.path && !next[item.path]) {
            next[item.path] = typeof item.msg === "string" ? item.msg : "Invalid value";
          }
        }
        setFieldErrors((prev) => ({ ...prev, ...next }));
      } else {
        toast.error(message || (status === 401 ? "Invalid email or password" : "Login failed"));
      }
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
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <input
            className={`input ${fieldErrors.email ? "input-error" : ""}`}
            type="email"
            placeholder="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="login-email-error" className="field-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div>
          <input
            className={`input ${fieldErrors.password ? "input-error" : ""}`}
            type="password"
            placeholder="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
          />
          {fieldErrors.password ? (
            <p id="login-password-error" className="field-error" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
