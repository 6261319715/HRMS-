const { eq, and } = require("drizzle-orm");
const { db } = require("../db");
const { users, notifications } = require("../db/schema");

/**
 * @param {object} params
 * @param {number} params.userId
 * @param {string} params.organizationName
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} [params.body]
 * @param {string} [params.linkPath]
 */
const createNotification = async ({ userId, organizationName, type, title, body, linkPath }) => {
  await db.insert(notifications).values({
    userId,
    organizationName,
    type,
    title,
    body: body || null,
    linkPath: linkPath || null,
    isRead: false,
  });
};

/**
 * Notify all admins in an org (e.g. new leave request). Optionally skip one user (submitter).
 */
const notifyOrganizationAdmins = async ({
  organizationName,
  excludeUserId,
  type,
  title,
  body,
  linkPath,
}) => {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.organizationName, organizationName), eq(users.role, "admin")));

  for (const row of admins) {
    if (excludeUserId != null && row.id === excludeUserId) {
      continue;
    }
    await createNotification({
      userId: row.id,
      organizationName,
      type,
      title,
      body,
      linkPath,
    });
  }
};

const safeNotify = async (fn) => {
  try {
    await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[notifications]", err?.message || err);
    }
  }
};

module.exports = { createNotification, notifyOrganizationAdmins, safeNotify };
