const { eq, and, desc, count } = require("drizzle-orm");
const { db } = require("../db");
const { users, notifications } = require("../db/schema");

const getCurrentUser = async (userId) => {
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] || null;
};

const mapRow = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  body: row.body,
  link_path: row.linkPath,
  read: row.isRead,
  created_at: row.createdAt,
});

const listNotifications = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, me.id), eq(notifications.organizationName, me.organizationName)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return res.status(200).json({ notifications: rows.map(mapRow) });
  } catch (error) {
    return res.status(500).json({ message: "Could not load notifications", error: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const [row] = await db
      .select({ n: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, me.id),
          eq(notifications.organizationName, me.organizationName),
          eq(notifications.isRead, false)
        )
      );

    return res.status(200).json({ unread: Number(row?.n ?? 0) });
  } catch (error) {
    return res.status(500).json({ message: "Could not load unread count", error: error.message });
  }
};

const markRead = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, me.id),
          eq(notifications.organizationName, me.organizationName)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({ notification: mapRow(updated) });
  } catch (error) {
    return res.status(500).json({ message: "Could not update notification", error: error.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    const me = await getCurrentUser(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, me.id), eq(notifications.organizationName, me.organizationName), eq(notifications.isRead, false))
      );

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Could not update notifications", error: error.message });
  }
};

module.exports = { listNotifications, getUnreadCount, markRead, markAllRead };
