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

// Apple OAuth Login
export const appleLogin = async (identityToken, authorizationCode) => {
    try {
        const response = await axiosInstance.post('/auth/apple', {
            identityToken: identityToken,
            authorizationCode: authorizationCode
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
