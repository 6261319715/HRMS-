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

module.exports = { users, attendanceRecords };
