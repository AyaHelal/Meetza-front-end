import axios from "axios";

const api = axios.create({
    baseURL: "https://meetza-backend.vercel.app/api",
    timeout: 10000, // 10 seconds timeout
});

// Request interceptor for debugging
api.interceptors.request.use((config) => {
    console.log("📤 API Request:", config.method?.toUpperCase(), config.url);
    console.log("📦 Request data:", config.data);
    return config;
}, (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
});

// Response interceptor for debugging
api.interceptors.response.use((response) => {
    console.log("📥 API Response:", response.status, response.config.url);
    console.log("📦 Response data:", response.data);
    return response;
}, (error) => {
    console.error("❌ API Error:", error.response?.status, error.config?.url);
    console.error("❌ Error details:", error.response?.data);
    return Promise.reject(error);
});

// Automatically attach token if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
