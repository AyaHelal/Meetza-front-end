import axiosInstance from './axiosInstance';

// Google OAuth Login
export const googleLogin = async (token) => {
    try {
        const response = await axiosInstance.post('/auth/google', {
            token: token
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Facebook OAuth Login
export const facebookLogin = async (accessToken) => {
    try {
        const response = await axiosInstance.post('/auth/facebook', {
            accessToken: accessToken
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// LinkedIn OAuth Login
export const linkedinLogin = async (accessToken) => {
    try {
        const response = await axiosInstance.post('/auth/linkedin', {
            accessToken: accessToken
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
