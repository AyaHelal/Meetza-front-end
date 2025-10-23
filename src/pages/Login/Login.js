import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutWrapper from '../../components/Login&SignUp/LayoutWrapper';
import { LoginLayout } from '../../components/Login&SignUp/LoginLayouts';
import { login } from "../../API/auth.js";
import './Login.css';
import { AuthContext } from "../../context/AuthContext";
const Login = () => {
    const navigate = useNavigate();
    const [currentImageIndex] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [totalFailedAttempts, setTotalFailedAttempts] = useState(0);
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const { loginUser } = useContext(AuthContext);

    const images = [
        '/assets/image 1.png',
        '/assets/image 2.png',
        '/assets/image 3.png',
        '/assets/image 4.png',
        '/assets/image 5.png'
    ];

    // Session-based CAPTCHA system - resets on every page load
    useEffect(() => {
        setFailedAttempts(0);
        setTotalFailedAttempts(0);
        setShowCaptcha(false);
        console.log('🔄 Session started - CAPTCHA counter reset to 0');
    }, []);

    // Show reCAPTCHA after 3 total failed attempts in the session
    useEffect(() => {
        if (totalFailedAttempts >= 3 && !showCaptcha) {
            setShowCaptcha(true);
            console.log('🚨 CAPTCHA triggered after', totalFailedAttempts, 'total failed attempts');
        }
    }, [totalFailedAttempts, showCaptcha]);

    // reCAPTCHA callback functions
    const onCaptchaChange = (token) => {
        console.log('✅ CAPTCHA completed successfully:', token ? 'Token received' : 'No token');
        setCaptchaToken(token);
        if (token) {
            setMessage({ text: "", type: "" }); // Clear any error messages
            console.log('🧹 Cleared error messages - CAPTCHA is now valid');
            // Hide reCAPTCHA after completion but keep total failed attempts
            setShowCaptcha(false);
            setFailedAttempts(0);
            console.log('✅ CAPTCHA completed - hiding reCAPTCHA, total attempts remain:', totalFailedAttempts);
        }
    };

    const onCaptchaExpired = () => {
        console.log('⏰ CAPTCHA expired - clearing token and resetting');
        setCaptchaToken('');
        setMessage({
            text: "CAPTCHA expired. Please complete it again.",
            type: "error"
        });

        // Re-show CAPTCHA if we have enough failed attempts
        if (totalFailedAttempts >= 3) {
            setShowCaptcha(true);
            console.log('🔄 Re-showing CAPTCHA after expiration');
        }

        // Force reset reCAPTCHA widget immediately
        if (window.grecaptcha) {
            try {
                window.grecaptcha.reset();
                console.log('🔄 reCAPTCHA widget reset immediately');
            } catch (error) {
                console.log('Could not reset reCAPTCHA widget');
            }
        }
    };

    // Reset CAPTCHA token when CAPTCHA is hidden
    useEffect(() => {
        if (!showCaptcha) {
            setCaptchaToken('');
        }
    }, [showCaptcha]);

    // Auto-refresh CAPTCHA after 5 seconds
    useEffect(() => {
        let timeoutId;

        if (showCaptcha && captchaToken) {
            console.log('⏰ Setting CAPTCHA auto-refresh timer (5 seconds)');
            timeoutId = setTimeout(() => {
                console.log('🔄 CAPTCHA expired after 5 seconds - refreshing');
                console.log('⏰ Clearing token and showing error message');
                setCaptchaToken('');
                setMessage({
                    text: "CAPTCHA expired. Please complete it again.",
                    type: "error"
                });

                // Re-show CAPTCHA if we have enough failed attempts
                if (totalFailedAttempts >= 3) {
                    setShowCaptcha(true);
                    console.log('🔄 Re-showing CAPTCHA after auto-expiration');
                }

                // Force reset reCAPTCHA widget
                if (window.grecaptcha) {
                    try {
                        window.grecaptcha.reset();
                        console.log('✅ reCAPTCHA widget reset successfully');
                    } catch (error) {
                        console.log('❌ Could not reset reCAPTCHA widget:', error.message);
                    }
                } else {
                    console.log('ℹ️ reCAPTCHA not available for reset');
                }
            }, 5 * 1000); // 5 seconds

            // Store timeout ID globally for cleanup
            window.captchaTimeoutId = timeoutId;
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                console.log('🧹 Cleared CAPTCHA timeout');
            }
            delete window.captchaTimeoutId;
        };
    }, [showCaptcha, captchaToken, totalFailedAttempts]);

    // Make functions globally available for reCAPTCHA
    useEffect(() => {
        window.onCaptchaChange = onCaptchaChange;
        window.onCaptchaExpired = onCaptchaExpired;

        return () => {
            delete window.onCaptchaChange;
            delete window.onCaptchaExpired;
        };
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear any existing CAPTCHA timeout
        if (window.captchaTimeoutId) {
            clearTimeout(window.captchaTimeoutId);
            delete window.captchaTimeoutId;
            console.log('🧹 Cleared existing CAPTCHA timeout');
        }

        // Check if CAPTCHA is required and not completed
        if (showCaptcha && !captchaToken) {
            setMessage({
                text: "Please complete the reCAPTCHA verification",
                type: "error"
            });
            return;
        }

        // Log CAPTCHA status for debugging
        if (showCaptcha) {
            console.log('🔐 Sending request with CAPTCHA token:', captchaToken ? 'Present' : 'Missing');
        }

        // Log current attempt count
        console.log(`📊 Login attempt ${failedAttempts + 1} - showCaptcha: ${showCaptcha}`);

        setIsLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const credentials = {
                email: formData.email,
                password: formData.password,
                remember_me: formData.rememberMe, // إضافة remember_me
                ...(showCaptcha && captchaToken && { captchaToken })
            };

            const response = await login(credentials);
            console.log("✅ Login successful:", response);

            if (response.success) {
                const { user, token } = response.data;

                // Reset all counters only on successful login
                setFailedAttempts(0);
                setTotalFailedAttempts(0);
                setShowCaptcha(false);
                setCaptchaToken('');

                // Force reset reCAPTCHA widget if it exists
                if (window.grecaptcha) {
                    try {
                        window.grecaptcha.reset();
                        console.log('🔄 reCAPTCHA widget reset');
                    } catch (error) {
                        console.log('ℹ️ No reCAPTCHA widget to reset');
                    }
                }

                loginUser(user, token, formData.rememberMe);
                setMessage({ text: response.message || "Login successful!", type: "success" });

                setTimeout(() => navigate("/"), 2000);
            } else {
                // Increment failed attempts counters
                const newAttempts = failedAttempts + 1;
                const newTotalAttempts = totalFailedAttempts + 1;
                setFailedAttempts(newAttempts);
                setTotalFailedAttempts(newTotalAttempts);

                // Show CAPTCHA after 3 total failed attempts in session
                if (newTotalAttempts >= 3) {
                    setShowCaptcha(true);
                    setMessage({
                        text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                        type: "error"
                    });
                    console.log(`🚨 CAPTCHA triggered after ${newTotalAttempts} total failed attempts`);
                } else {
                    setMessage({ text: response.message || "Invalid email or password", type: "error" });
                }
            }
        } catch (error) {
            console.error("❌ Login error:", error);

            // Increment failed attempts counters on error
            const newAttempts = failedAttempts + 1;
            const newTotalAttempts = totalFailedAttempts + 1;
            setFailedAttempts(newAttempts);
            setTotalFailedAttempts(newTotalAttempts);

            // Show CAPTCHA after 3 total failed attempts in session
            if (newTotalAttempts >= 3) {
                setShowCaptcha(true);
                setMessage({
                    text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                    type: "error"
                });
                console.log(`🚨 CAPTCHA triggered after ${newTotalAttempts} total failed attempts`);
            } else {
                setMessage({
                    text: error.response?.data?.message || "Error occurred during login",
                    type: "error"
                });
            }
        } finally {
            setIsLoading(false);
            console.log('📊 Login attempt finished - total attempts:', totalFailedAttempts, 'showCaptcha:', showCaptcha, 'captchaToken:', captchaToken ? 'Present' : 'Empty');
        }
    };

    const handleSignUpClick = () => navigate('/signup');
    const handleForgotPassword = () => navigate('/forgot-password');

    const handleSkipCaptcha = () => {
        setShowCaptcha(false);
        setCaptchaToken('');
        setFailedAttempts(0);
        // Don't reset totalFailedAttempts - keep them for re-triggering CAPTCHA
        setMessage({
            text: "CAPTCHA skipped. Please try logging in again.",
            type: "info"
        });
        console.log('⏭️ CAPTCHA skipped - total attempts remain:', totalFailedAttempts);
    };

    return (
        <LayoutWrapper activeTab="signin">
            <LoginLayout
                activeTab="signin"
                setActiveTab={handleSignUpClick}
                formData={formData}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                currentImageIndex={currentImageIndex}
                images={images}
                message={message}
                showCaptcha={showCaptcha}
                onCaptchaChange={onCaptchaChange}
                onCaptchaExpired={onCaptchaExpired}
                onForgotPassword={handleForgotPassword}
                onSkipCaptcha={handleSkipCaptcha}
                failedAttempts={totalFailedAttempts}
            />
        </LayoutWrapper>
    );
};

export default Login;
