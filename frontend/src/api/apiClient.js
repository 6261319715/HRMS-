import axios from "axios";
import { API_BASE_URL } from "../config/api";

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
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
