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
