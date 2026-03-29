import axios from "axios";
import { API_BASE_URL } from "../config/api";

// Render free tier cold starts often exceed 15s; override via VITE_API_TIMEOUT_MS if needed.
const parsedTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const timeoutMs =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 90_000;

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: timeoutMs,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.error("API request failed:", {
      method: error?.config?.method,
      url: error?.config?.url,
      status: error?.response?.status,
      message: error?.response?.data?.message || error.message,
    });
    return Promise.reject(error);
  }
);

export default apiClient;
