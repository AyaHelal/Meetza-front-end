// Social Auth Configuration
// قم بإضافة هذه المتغيرات إلى ملف .env الخاص بك

export const SOCIAL_AUTH_CONFIG = {
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',

    // Facebook OAuth
    FACEBOOK_APP_ID: process.env.REACT_APP_FACEBOOK_APP_ID || '',

    // Apple OAuth
    APPLE_CLIENT_ID: process.env.REACT_APP_APPLE_CLIENT_ID || '',

    // API Base URL
    API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
};

export const validateSocialAuthConfig = () => {
    const missing = [];

    if (!SOCIAL_AUTH_CONFIG.GOOGLE_CLIENT_ID) {
        missing.push('REACT_APP_GOOGLE_CLIENT_ID');
    }

    if (!SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID) {
        missing.push('REACT_APP_FACEBOOK_APP_ID');
    }

    if (!SOCIAL_AUTH_CONFIG.APPLE_CLIENT_ID) {
        missing.push('REACT_APP_APPLE_CLIENT_ID');
    }

    if (missing.length > 0) {
        console.warn('⚠️ Missing environment variables:', missing.join(', '));
        console.warn('Please add these variables to your .env file');
    }

    return missing.length === 0;
};
