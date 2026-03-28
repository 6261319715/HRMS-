const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { eq } = require("drizzle-orm");
const { db } = require("../db");
const { users } = require("../db/schema");
const { consumeInviteToken, getInviteToken } = require("../services/inviteStore");

const createToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  const { name, email, password, organization_name, mobile_number } = req.body;

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        organizationName: organization_name,
        mobileNumber: mobile_number,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        organizationName: users.organizationName,
        mobileNumber: users.mobileNumber,
        role: users.role,
        createdAt: users.createdAt,
      });

    return res.status(201).json({
      message: "Admin signup successful",
      user: inserted[0],
    });
  } catch (error) {
    return res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const foundUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (foundUsers.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = foundUsers[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organization_name: user.organizationName,
        mobile_number: user.mobileNumber,
        role: user.role,
        created_at: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

const profile = async (req, res) => {
  try {
    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = foundUsers[0];
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organization_name: user.organizationName,
        mobile_number: user.mobileNumber,
        role: user.role,
        created_at: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch profile", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, mobile_number } = req.body;
    const updates = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }
    if (typeof mobile_number === "string" && /^\d{10}$/.test(mobile_number)) {
      updates.mobileNumber = mobile_number;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid profile fields provided" });
    }

    const updatedRows = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user.id))
      .returning();

    if (updatedRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = updatedRows[0];
    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organization_name: user.organizationName,
        mobile_number: user.mobileNumber,
        role: user.role,
        created_at: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not update profile", error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const foundUsers = await db.select().from(users).where(eq(users.id, req.user.id));
    if (foundUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = foundUsers[0];
    const isValid = await bcrypt.compare(current_password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, req.user.id));

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not change password", error: error.message });
  }
};

const inviteSignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  const { token, name, email, password, mobile_number } = req.body;
  const inviteData = getInviteToken(token);

  if (!inviteData) {
    return res.status(400).json({ message: "Invalid or expired invite token" });
  }

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        organizationName: inviteData.organizationName,
        mobileNumber: mobile_number,
        role: "employee",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        organizationName: users.organizationName,
        mobileNumber: users.mobileNumber,
        role: users.role,
        createdAt: users.createdAt,
      });

    consumeInviteToken(token);

    return res.status(201).json({
      message: "Employee signup successful",
      user: inserted[0],
    });
  } catch (error) {
    return res.status(500).json({ message: "Invite signup failed", error: error.message });
  }
};

module.exports = { signup, login, profile, inviteSignup, updateProfile, changePassword };
