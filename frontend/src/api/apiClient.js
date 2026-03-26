import axios from "axios";

const defaultApiBase =
  import.meta.env.PROD
    ? "/api"
    : "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiBase,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
