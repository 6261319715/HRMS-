const { pgTable, serial, varchar, timestamp, integer, uniqueIndex, boolean } = require("drizzle-orm/pg-core");

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  mobileNumber: varchar("mobile_number", { length: 10 }).notNull(),
  role: varchar("role", { length: 30 }).notNull().default("admin"),
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  emailVerified: boolean("email_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  emailVerificationOtp: varchar("email_verification_otp", { length: 10 }),
  emailVerificationOtpExpiresAt: timestamp("email_verification_otp_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationName: varchar("organization_name", { length: 255 }).notNull(),
    attendanceDate: varchar("attendance_date", { length: 10 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    checkIn: varchar("check_in", { length: 20 }),
    checkOut: varchar("check_out", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userDateUnique: uniqueIndex("attendance_user_date_unique").on(table.userId, table.attendanceDate),
  })
);

const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  leaveType: varchar("leave_type", { length: 50 }).notNull(),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  reason: varchar("reason", { length: 2000 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: varchar("body", { length: 2000 }),
  linkPath: varchar("link_path", { length: 255 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const payslips = pgTable(
  "payslips",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationName: varchar("organization_name", { length: 255 }).notNull(),
    payPeriod: varchar("pay_period", { length: 7 }).notNull(),
    basicSalary: varchar("basic_salary", { length: 24 }).notNull(),
    hra: varchar("hra", { length: 24 }).notNull().default("0"),
    bonus: varchar("bonus", { length: 24 }).notNull().default("0"),
    deductionAmount: varchar("deduction_amount", { length: 24 }).notNull().default("0"),
    netAmount: varchar("net_amount", { length: 24 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    status: varchar("status", { length: 20 }).notNull().default("unpaid"),
    notes: varchar("notes", { length: 500 }),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    payslipUserPeriodUnique: uniqueIndex("payslips_user_period_unique").on(table.userId, table.payPeriod),
  })
);

module.exports = { users, attendanceRecords, leaveRequests, notifications, payslips };
