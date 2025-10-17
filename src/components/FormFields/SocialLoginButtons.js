import { Button } from 'react-bootstrap';
import { FaFacebook, FaApple } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { googleLogin, facebookLogin, appleLogin } from '../../API/socialAuth';
import '../../pages/Login/Login.css';

const SocialLoginButtons = () => {
    const navigate = useNavigate();
    const { loginUser } = useContext(AuthContext);

    // Google Login Handler
    const handleGoogleLogin = async () => {
        try {
            if (window.google && window.google.accounts) {
                window.google.accounts.oauth2.initTokenClient({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    scope: 'email profile',
                    callback: async (response) => {
                        if (response.access_token) {
                            const result = await googleLogin(response.access_token);
                            if (result.success) {
                                loginUser(result.user, result.token, true);
                                navigate('/');
                            }
                        }
                    },
                }).requestAccessToken();
            } else {
                alert('Google OAuth not loaded. Please check your configuration.');
            }
        } catch (error) {
            console.error('Google login error:', error);
            alert('Google login failed. Please try again.');
        }
    };

    // Facebook Login Handler
const handleFacebookLogin = async () => {
    try {
        if (window.FB) {
            window.FB.login((response) => {
                if (response.authResponse) {
                    (async () => {
                        try {
                            const result = await facebookLogin(response.authResponse.accessToken);
                            if (result.success) {
                                loginUser(result.user, result.token, true);
                                navigate('/');
                            }
                        } catch (error) {
                            console.error('Facebook login error:', error);
                            alert('Facebook login failed. Please try again.');
                        }
        })();
    }
            }, { scope: 'email' });
        } else {
            alert('Facebook SDK not loaded. Please check your configuration.');
        }
    } catch (error) {
        console.error('Facebook login error:', error);
        alert('Facebook login failed. Please try again.');
    }
};


    // Apple Login Handler
    const handleAppleLogin = async () => {
        try {
            if (window.AppleID) {
                window.AppleID.auth.init({
                    clientId: process.env.REACT_APP_APPLE_CLIENT_ID,
                    scope: 'email name',
                    redirectURI: window.location.origin,
                    usePopup: true
                });

                const data = await window.AppleID.auth.signIn();
                const result = await appleLogin(data.id_token, data.code);
                if (result.success) {
                    loginUser(result.user, result.token, true);
                    navigate('/');
                }
            } else {
                alert('Apple Sign-In not loaded. Please check your configuration.');
            }
        } catch (error) {
            console.error('Apple login error:', error);
            alert('Apple login failed. Please try again.');
        }
    };

    return (
        <>
            <p className="text-center text-muted small mb-3">Or continue with</p>
            <div className="d-flex justify-content-center gap-3 social-buttons">
                <Button
                    variant="outline-secondary"
                    className="rounded-circle p-1 border"
                    onClick={handleGoogleLogin}
                    style={{
                        width: '55px',
                        height: '55px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                >
                    <svg width="40" height="40" viewBox="0 0 24 24">
                        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                </Button>
                <Button
                    variant="outline-secondary"
                    className="rounded-circle p-1 border"
                    onClick={handleFacebookLogin}
                    style={{
                        width: '55px',
                        height: '55px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        color: '#1877f2'
                    }}
                >
                    <FaFacebook size={40} />
                </Button>
                <Button
                    variant="outline-secondary"
                    className="rounded-circle p-1 border"
                    onClick={handleAppleLogin}
                    style={{
                        width: '55px',
                        height: '55px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        color: '#000000',
                        border: '5px solid #000000',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        <FaApple size={28} color="#ffffff" />
                    </div>
                </Button>
            </div>
        </>
    );
};

export default SocialLoginButtons;
