import axios from "axios";

// Use environment variable or default to ngrok URL
const API_BASE_URL = (process.env.REACT_APP_API_URL || " http://localhost:4000/api").trim();
export { API_BASE_URL };

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

  // Add ngrok-skip-browser-warning header to bypass ngrok browser warning page
  if (API_BASE_URL.includes('ngrok')) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
  }

  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    // Suppress 403 errors for /info and /position endpoints (expected for permission-related endpoints)
    const isInfoEndpoint = url.includes("/info");
    const isPositionEndpoint = url === "/position" || url.endsWith("/position");
    if (status === 403 && (isInfoEndpoint || isPositionEndpoint)) {
      return Promise.reject(error);
    }

    // Suppress noisy 404 for calendar meetings or chat background fetches
    const isMeetingsList = (url === "/meetings" || url === "/meeting") && error.config?.params && Object.keys(error.config.params).length > 0;
    const isChatBackgroundFetch = url.includes("/chat/groups/") && (url.includes("/messages") || url.includes("/unread-count"));

    if (status === 404 && (isMeetingsList || isChatBackgroundFetch)) {
      return Promise.reject(error);
    }

    console.error("❌ API Error:", {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: (error.config?.baseURL || "") + (error.config?.url || ""),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default api;
