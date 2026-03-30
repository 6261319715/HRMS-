import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/AuthLayout";
import apiClient from "../api/apiClient";
import { validateSignupForm } from "../utils/authFormValidation";

const initialState = {
  name: "",
  email: "",
  password: "",
  organization_name: "",
  mobile_number: "",
};

const SignupPage = () => {
  const [formData, setFormData] = useState(initialState);
  const [fieldErrors, setFieldErrors] = useState({});
  const { toast } = useToast();
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");
  const isInviteSignup = Boolean(token);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "mobile_number") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digits }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    email: formData.email.trim(),
    password: formData.password,
    organization_name: formData.organization_name.trim(),
    mobile_number: formData.mobile_number.replace(/\D/g, ""),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateSignupForm(formData, { isInvite: isInviteSignup });
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      return;
    }
    setFieldErrors({});

    const payload = buildPayload();

    try {
      if (isInviteSignup) {
        await apiClient.post("/auth/invite-signup", {
          token,
          name: payload.name,
          email: payload.email,
          password: payload.password,
          mobile_number: payload.mobile_number,
        });
        toast.success("Employee signup successful. Please login.");
      } else {
        await signup({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          organization_name: payload.organization_name,
          mobile_number: payload.mobile_number,
        });
        toast.success("Signup successful. Please login.");
      }
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      const data = err?.response?.data;
      const validationErrors = data?.errors;
      const next = {};
      if (Array.isArray(validationErrors)) {
        for (const item of validationErrors) {
          if (item.path && !next[item.path]) {
            next[item.path] = typeof item.msg === "string" ? item.msg : "Invalid value";
          }
        }
      }
      if (Object.keys(next).length > 0) {
        setFieldErrors(next);
      } else {
        toast.error(data?.message || "Signup failed");
      }
    }
  };

  return (
    <AuthLayout
      title={isInviteSignup ? "Employee Signup via Invite" : "Staffly Signup"}
      subtitle={
        isInviteSignup
          ? "Complete your employee signup to join your organization."
          : "Create your organization admin account."
      }
      sideHeading={isInviteSignup ? "Employee Onboarding" : "Join Us"}
      sideDescription={
        isInviteSignup
          ? "You are joining through an invite link. Fill details below to activate your employee account."
          : "Set up your organization in minutes and start managing attendance, payroll, and employee workflows in Staffly."
      }
      footer={
        <span>
          Already have an account?{" "}
          <Link className="font-medium text-blue-700 hover:text-blue-800" to="/login">
            Login
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <input
            className={`input ${fieldErrors.name ? "input-error" : ""}`}
            placeholder="Full name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? (
            <p className="field-error" role="alert">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>
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
          />
          {fieldErrors.email ? (
            <p className="field-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div>
          <input
            className={`input ${fieldErrors.password ? "input-error" : ""}`}
            type="password"
            placeholder="Password (min. 6 characters)"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password ? (
            <p className="field-error" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>
        {!isInviteSignup ? (
          <div>
            <input
              className={`input ${fieldErrors.organization_name ? "input-error" : ""}`}
              placeholder="Organization name"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.organization_name)}
            />
            {fieldErrors.organization_name ? (
              <p className="field-error" role="alert">
                {fieldErrors.organization_name}
              </p>
            ) : null}
          </div>
        ) : null}
        <div>
          <input
            className={`input ${fieldErrors.mobile_number ? "input-error" : ""}`}
            placeholder="Mobile number (10 digits)"
            name="mobile_number"
            value={formData.mobile_number}
            onChange={handleChange}
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            aria-invalid={Boolean(fieldErrors.mobile_number)}
          />
          {fieldErrors.mobile_number ? (
            <p className="field-error" role="alert">
              {fieldErrors.mobile_number}
            </p>
          ) : null}
        </div>
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Creating account..." : "Signup"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default SignupPage;
