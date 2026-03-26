import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const persistAuth = (nextToken, nextUser) => {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const signup = async (payload) => {
    setLoading(true);
    try {
      const response = await apiClient.post("/auth/signup", payload);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const login = async (payload) => {
    setLoading(true);
    try {
      const response = await apiClient.post("/auth/login", payload);
      persistAuth(response.data.token, response.data.user);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!token) return null;
    const response = await apiClient.get("/auth/profile");
    setUser(response.data.user);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data.user;
  };

  const logout = () => {
    clearAuth();
  };

  useEffect(() => {
    if (!token) return;
    fetchProfile().catch(() => {
      clearAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      signup,
      login,
      logout,
      fetchProfile,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
