import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!token || !user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await apiClient.get("/notifications/unread-count");
      setUnreadCount(res.data.unread ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [token, user]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!token || !user) return undefined;
    const id = setInterval(refreshUnread, 45000);
    return () => clearInterval(id);
  }, [token, user, refreshUnread]);

  useEffect(() => {
    const onFocus = () => refreshUnread();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUnread]);

  const value = useMemo(() => ({ unreadCount, refreshUnread }), [unreadCount, refreshUnread]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
};
