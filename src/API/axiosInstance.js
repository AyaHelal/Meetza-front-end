import axios from "axios";

// Use environment variable or default to ngrok URL
const API_BASE_URL = process.env.REACT_APP_API_URL || " https://hulda-unglutted-curably.ngrok-free.dev/api";

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
    // Suppress 403 errors for /info and /position endpoints (expected for permission-related endpoints)
    const isInfoEndpoint = error.config?.url?.includes('/info');
    const isPositionEndpoint = error.config?.url === '/position' || error.config?.url?.endsWith('/position');
    const is403 = error.response?.status === 403;

    if (!(is403 && (isInfoEndpoint || isPositionEndpoint))) {
      console.error("❌ API Error:", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

export default api;
