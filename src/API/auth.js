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
export const verifyEmail = async (email, code, recaptchaToken = null) => {
    try {
        const requestData = { email, code };
        if (recaptchaToken) {
            requestData.recaptchaToken = recaptchaToken;
        }
        const response = await axiosInstance.post("/auth/verify", requestData);
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

// ✅ Forgot password - send reset code
export const forgotPassword = async (email) => {
    try {
        const response = await axiosInstance.post("/auth/forgot_password", { email });
        return response.data;
    } catch (error) {
        console.error("❌ Forgot password error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Resend reset code (same as forgot password)
export const resendResetCode = async (email) => {
    try {
        const response = await axiosInstance.post("/auth/forgot_password", { email });
        return response.data;
    } catch (error) {
        console.error("❌ Resend reset code error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Verify reset code
export const verifyResetCode = async (email, code) => {
    try {
        const response = await axiosInstance.post("/auth/verify_code", { email, code });
        return response.data;
    } catch (error) {
        console.error("❌ Verify reset code error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Reset password
export const resetPassword = async (email, newPassword, isVerified = "true") => {
    try {
        const response = await axiosInstance.post("/auth/reset_password", {
            email,
            new_password: newPassword,
            is_verifyed: isVerified
        });
        return response.data;
    } catch (error) {
        console.error("❌ Reset password error:", error.response?.status, error.response?.data);
        throw error;
    }
};
