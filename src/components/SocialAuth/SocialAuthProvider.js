import { useEffect } from 'react';
import { SOCIAL_AUTH_CONFIG, validateSocialAuthConfig } from '../../config/socialAuthConfig';

const SocialAuthProvider = ({ children }) => {
    useEffect(() => {
        validateSocialAuthConfig();

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
                        version: 'v17.0'
                    });

                    console.log('Facebook SDK initialized with App ID:', SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID);

                    window.FB.getLoginStatus(function(response) {
                    console.log('✅ FB SDK initialized successfully. Status:', response.status);
                    });

                };

                const script = document.createElement('script');
                script.src = 'https://connect.facebook.net/en_US/sdk.js';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    console.log('Facebook SDK loaded successfully');
                };
                script.onerror = (error) => {
                    console.error('Failed to load Facebook SDK:', error);
                };
                document.head.appendChild(script);
            } else if (!SOCIAL_AUTH_CONFIG.FACEBOOK_APP_ID) {
                console.warn('Facebook App ID not configured');
            }
        };

        const loadLinkedInSDK = () => {
            if (!window.LinkedIn && SOCIAL_AUTH_CONFIG.LINKEDIN_CLIENT_ID) {
                const script = document.createElement('script');
                script.src = 'https://platform.linkedin.com/in.js';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    console.log('LinkedIn SDK loaded successfully');
                };
                script.onerror = (error) => {
                    console.error('Failed to load LinkedIn SDK:', error);
                };
                document.head.appendChild(script);
            } else if (!SOCIAL_AUTH_CONFIG.LINKEDIN_CLIENT_ID) {
                console.warn('LinkedIn Client ID not configured');
            }
        };

        loadGoogleSDK();
        loadFacebookSDK();
        loadLinkedInSDK();
    }, []);

    return <>{children}</>;
};

export default SocialAuthProvider;
