/** Align rules with backend `authValidators.js` */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginForm({ email, password }) {
  const errors = {};
  const trimmedEmail = (email || "").trim();

  if (!trimmedEmail) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = "Please enter a valid email";
  }

  if (!password) {
    errors.password = "Password is required";
  }

  return errors;
}

export function validateSignupForm(formData, { isInvite }) {
  const errors = {};
  const name = (formData.name || "").trim();
  if (!name) {
    errors.name = "Name is required";
  }

  const email = (formData.email || "").trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Please enter a valid email";
  }

  const password = formData.password || "";
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!isInvite) {
    const org = (formData.organization_name || "").trim();
    if (!org) {
      errors.organization_name = "Organization name is required";
    }
  }

  const mobileDigits = (formData.mobile_number || "").replace(/\D/g, "");
  if (!mobileDigits) {
    errors.mobile_number = "Mobile number is required";
  } else if (mobileDigits.length !== 10) {
    errors.mobile_number = "Mobile number must be exactly 10 digits";
  }

  return errors;
}
