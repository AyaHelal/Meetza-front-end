import axiosInstance from "./axiosInstance";

// ✅ Register a new user
export const signup = async (userData) => {
    // Transform email field to match backend expectations
    const transformedData = {
        ...userData,
        Email: userData.email  // Transform email to Email
    };
    delete transformedData.email; // Remove lowercase email

    const response = await axiosInstance.post("/auth/register", transformedData);
    return response.data;
};

// ✅ Login user
export const login = async (credentials) => {
    // Transform email field to match backend expectations
    const transformedCredentials = {
        ...credentials,
        Email: credentials.email  // Transform email to Email
    };
    delete transformedCredentials.email; // Remove lowercase email

    const response = await axiosInstance.post("/auth/login", transformedCredentials);
    return response.data;
};

// ✅ Verify email code
export const verifyEmail = async (email, code) => {
    try {
        const response = await axiosInstance.post("/auth/verify", { Email: email, code });
        return response.data;
    } catch (error) {
        console.error("❌ Verify endpoint error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Resend verification code
export const resendVerificationCode = async (email) => {
    try {
        const response = await axiosInstance.post("/auth/resend-code", { Email: email });
        return response.data;
    } catch (error) {
        console.error("❌ Resend endpoint error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Forgot password - send reset code
export const forgotPassword = async (email) => {
    try {
        const response = await axiosInstance.post("/auth/forgot_password", { Email: email });
        return response.data;
    } catch (error) {
        console.error("❌ Forgot password error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Resend reset code (same as forgot password)
export const resendResetCode = async (email) => {
    try {
        const response = await axiosInstance.post("/auth/forgot_password", { Email: email });
        return response.data;
    } catch (error) {
        console.error("❌ Resend reset code error:", error.response?.status, error.response?.data);
        throw error;
    }
};

// ✅ Verify reset code
export const verifyResetCode = async (email, code) => {
    try {
        const response = await axiosInstance.post("/auth/verify_code", { Email: email, code });
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
            email: email,
            new_password: newPassword,
            is_verifyed: isVerified
        });
        return response.data;
    } catch (error) {
        console.error("❌ Reset password error:", error.response?.status, error.response?.data);
        throw error;
    }
};
