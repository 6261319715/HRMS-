const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { listNotifications, getUnreadCount, markRead, markAllRead } = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authMiddleware, listNotifications);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.patch("/:id/read", authMiddleware, markRead);
router.post("/read-all", authMiddleware, markAllRead);

module.exports = router;
