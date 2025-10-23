import axiosInstance from "./axiosInstance";

// ✅ Register a new user
export const signup = async (userData) => {
    const response = await axiosInstance.post("/auth/register", userData);
    return response.data;
};

// ✅ Login user
export const login = async (credentials) => {
    const response = await axiosInstance.post("/auth/login", credentials);
    return response.data;
};

// ✅ Verify email code
export const verifyEmail = async (email, code) => {
    try {
        const response = await axiosInstance.post("/auth/verify", { email, code });
        return response.data;
    } catch (error) {
        console.error("❌ Verify endpoint error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Resend verification code
export const resendVerificationCode = async (email) => {
    try {
        const response = await axiosInstance.post("/auth/resend-code", { email });
        return response.data;
    } catch (error) {
        console.error("❌ Resend endpoint error:", error.response?.status, error.response?.data);
        throw error;
    }
};
