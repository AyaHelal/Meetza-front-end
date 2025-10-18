import { useEffect } from 'react';
import { SOCIAL_AUTH_CONFIG, validateSocialAuthConfig } from '../../config/socialAuthConfig';

const SocialAuthProvider = ({ children }) => {
    useEffect(() => {
        validateSocialAuthConfig();

        if (window.FB && window.FB.init) {
            console.log("✅ Facebook SDK already loaded");
            return;
        }

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
        if (window.FB) {
            console.log('✅ Facebook SDK already loaded');
            return;
        }

        if (!SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID) {
            console.warn('⚠️ Facebook App ID not configured');
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
            appId: SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID,
            cookie: true,
            xfbml: true,
            version: 'v18.0',
            });
            console.log('✅ Facebook SDK initialized with App ID:', SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID);
        };

        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.onload = () => console.log('✅ Facebook SDK script loaded successfully');
        script.onerror = (error) => console.error('❌ Failed to load Facebook SDK:', error);
        document.body.appendChild(script);
        };


        const loadLinkedInSDK = () => {
            if (!SOCIAL_AUTH_CONFIG.LINKEDIN_CLIENT_ID) {
                console.warn('⚠️ LinkedIn Client ID not configured');
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://platform.linkedin.com/in.js';
            script.async = true;
            script.defer = true;
            script.onload = () => console.log('LinkedIn SDK loaded successfully');
            script.onerror = (error) => console.error('Failed to load LinkedIn SDK:', error);
            document.head.appendChild(script);
        };

        loadGoogleSDK();
        loadFacebookSDK();
        loadLinkedInSDK();
    }, []);

    return <>{children}</>;
};

export default SocialAuthProvider;
