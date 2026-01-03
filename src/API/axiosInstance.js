import axios from "axios";

// Use environment variable or default to ngrok URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://hulda-unglutted-curably.ngrok-free.dev/api";

// Log the API base URL for debugging (remove in production)
console.log("🔧 API Base URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Automatically attach token if it exists
api.interceptors.request.use((config) => {
  let token = localStorage.getItem("token");
  if (!token) {
    token = sessionStorage.getItem("token");
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
