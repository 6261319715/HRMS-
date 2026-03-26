const { body } = require("express-validator");

const signupValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("organization_name")
    .trim()
    .notEmpty()
    .withMessage("Organization name is required"),
  body("mobile_number")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required")
    .isNumeric()
    .withMessage("Mobile number must be numeric")
    .isLength({ min: 10, max: 10 })
    .withMessage("Mobile number must be exactly 10 digits"),
];

const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
];

const inviteSignupValidator = [
  body("token").trim().notEmpty().withMessage("Invite token is required"),
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("mobile_number")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required")
    .isNumeric()
    .withMessage("Mobile number must be numeric")
    .isLength({ min: 10, max: 10 })
    .withMessage("Mobile number must be exactly 10 digits"),
];

module.exports = { signupValidator, loginValidator, inviteSignupValidator };
