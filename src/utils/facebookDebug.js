// Facebook Debug Utilities

export const debugFacebookSDK = () => {
    console.log('=== Facebook SDK Debug ===');
    
    // Check if Facebook SDK is loaded
    if (window.FB) {
        console.log('✅ Facebook SDK is loaded');
        console.log('FB object:', window.FB);
        
        // Check if SDK is initialized
        window.FB.getLoginStatus((response) => {
            console.log('Facebook login status:', response);
        });
    } else {
        console.log('❌ Facebook SDK is not loaded');
    }
    
    // Check environment variables
    console.log('Facebook App ID configured:', !!process.env.REACT_APP_FACEBOOK_APP_ID);
    console.log('Facebook App ID value:', process.env.REACT_APP_FACEBOOK_APP_ID ? 'Set' : 'Not set');
    
    // Check if we're in development mode
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Current URL:', window.location.href);
};

export const testFacebookLogin = () => {
    if (window.FB) {
        console.log('Testing Facebook login...');
        
        window.FB.login((response) => {
            console.log('Test login response:', response);
            
            if (response.authResponse) {
                console.log('✅ Login successful');
                console.log('Access Token:', response.authResponse.accessToken);
                console.log('User ID:', response.authResponse.userID);
            } else {
                console.log('❌ Login failed');
                console.log('Status:', response.status);
            }
        }, { scope: 'email' });
    } else {
        console.log('❌ Facebook SDK not available for testing');
    }
};

// Add to window for easy debugging
if (typeof window !== 'undefined') {
    window.debugFacebook = debugFacebookSDK;
    window.testFacebookLogin = testFacebookLogin;
}
