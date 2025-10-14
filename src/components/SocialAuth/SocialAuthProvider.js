import { useEffect } from 'react';
import { SOCIAL_AUTH_CONFIG, validateSocialAuthConfig } from '../../config/socialAuthConfig';

const SocialAuthProvider = ({ children }) => {
    useEffect(() => {
        validateSocialAuthConfig();

        // تحميل Google OAuth SDK
        const loadGoogleSDK = () => {
            if (!window.google) {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    if (SOCIAL_AUTH_CONFIG.GOOGLE_CLIENT_ID) {
                        window.google.accounts.id.initialize({
                            client_id: SOCIAL_AUTH_CONFIG.GOOGLE_CLIENT_ID,
                            auto_select: false,
                            cancel_on_tap_outside: true
                        });
                    }
                };
                document.head.appendChild(script);
            }
        };

        const loadFacebookSDK = () => {
            if (!window.FB && SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID) {
                window.fbAsyncInit = function() {
                    window.FB.init({
                        appId: SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID,
                        cookie: true,
                        xfbml: true,
                        version: 'v18.0'
                    });
                };

                const script = document.createElement('script');
                script.src = 'https://connect.facebook.net/en_US/sdk.js';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
        };

        const loadAppleSDK = () => {
            if (!window.AppleID && SOCIAL_AUTH_CONFIG.APPLE_CLIENT_ID) {
                const script = document.createElement('script');
                script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
        };

        loadGoogleSDK();
        loadFacebookSDK();
        loadAppleSDK();
    }, []);

    return <>{children}</>;
};

export default SocialAuthProvider;
