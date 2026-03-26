import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import apiClient from "../api/apiClient";

const initialState = {
  name: "",
  email: "",
  password: "",
  organization_name: "",
  mobile_number: "",
};

const SignupPage = () => {
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");
  const isInviteSignup = Boolean(token);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(token);
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const { name, email, password, organization_name, mobile_number } = formData;
    const missingAdminFields = !isInviteSignup && !organization_name;

    if (!name || !email || !password || !mobile_number || missingAdminFields) {
      return "All fields are required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email";
    }

    if (!/^\d{10}$/.test(mobile_number)) {
      return "Mobile number must be numeric and exactly 10 digits";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      if (isInviteSignup) {
        await apiClient.post("/auth/invite-signup", {
          token,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          mobile_number: formData.mobile_number,
        });
        setSuccess("Employee signup successful. Please login.");
      } else {
        await signup(formData);
        setSuccess("Signup successful. Please login.");
      }
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed");
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
      {error ? <p className="alert alert-error mb-4">{error}</p> : null}
      {success ? (
        <p className="alert alert-success mb-4">{success}</p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Full name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />
        {!isInviteSignup ? (
          <input
            className="input"
            placeholder="Organization name"
            name="organization_name"
            value={formData.organization_name}
            onChange={handleChange}
          />
        ) : null}
        <input
          className="input"
          placeholder="Mobile number"
          name="mobile_number"
          value={formData.mobile_number}
          onChange={handleChange}
          maxLength={10}
        />
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Creating account..." : "Signup"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default SignupPage;
