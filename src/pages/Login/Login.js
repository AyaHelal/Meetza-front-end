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
        console.log('🔄 Starting new session - resetting failed attempts');
        setFailedAttempts(0);
        setShowCaptcha(false);
        setCaptchaToken('');
        console.log('✅ Session reset complete - failedAttempts: 0, showCaptcha: false');
    }, []);

    // reCAPTCHA callback functions
    const onCaptchaChange = (token) => {
        console.log('🎯 reCAPTCHA API called onCaptchaChange with token:', token);
        console.log('✅ CAPTCHA completed successfully:', token ? 'Token received' : 'No token');
        setCaptchaToken(token);
        if (token) {
            setMessage({ text: "", type: "" }); // Clear any error messages
            console.log('🧹 Cleared error messages - CAPTCHA is now valid');
        }
    };

    const onCaptchaExpired = () => {
        console.log('🎯 reCAPTCHA API called onCaptchaExpired');
        console.log('⏰ CAPTCHA expired - clearing token and incrementing failed attempts');
        setCaptchaToken('');

        // Increment failed attempts when CAPTCHA expires
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        console.log(`📈 Failed attempts incremented to ${newAttempts} due to CAPTCHA expiration`);

        // Check if we need to show CAPTCHA again after expiration
        if (newAttempts >= 3) {
            setShowCaptcha(true);
            setMessage({
                text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                type: "error"
            });
            console.log(`🚨 CAPTCHA shown again after ${newAttempts} failed attempts`);
        } else {
            setMessage({
                text: "CAPTCHA expired. Please complete it again.",
                type: "error"
            });
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
            console.log('🎯 reCAPTCHA API called onCaptchaExpired');
            console.log('⏰ Setting CAPTCHA auto-refresh timer (5 seconds)');
            timeoutId = setTimeout(() => {
                console.log('🎯 Auto-refresh timeout triggered');
                console.log('🔄 CAPTCHA expired after 5 seconds - incrementing failed attempts');
                console.log(`📈 Current failed attempts: ${failedAttempts}, incrementing to ${failedAttempts + 1}`);

                setCaptchaToken('');

                // Increment failed attempts when CAPTCHA expires
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);

                // Check if we need to show CAPTCHA again after expiration
                if (newAttempts >= 3) {
                    setShowCaptcha(true);
                    setMessage({
                        text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                        type: "error"
                    });
                    console.log(`🚨 CAPTCHA shown again after ${newAttempts} failed attempts (auto-expired)`);
                } else {
                    setMessage({
                        text: "CAPTCHA expired. Please complete it again.",
                        type: "error"
                    });
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
    }, [showCaptcha, captchaToken]);

    // Make functions globally available for reCAPTCHA
    useEffect(() => {
        console.log('🔧 Setting up global reCAPTCHA functions');
        window.onCaptchaChange = onCaptchaChange;
        window.onCaptchaExpired = onCaptchaExpired;

        // Test if functions are properly set
        console.log('✅ Global functions set:', {
            onCaptchaChange: typeof window.onCaptchaChange,
            onCaptchaExpired: typeof window.onCaptchaExpired
        });

        return () => {
            console.log('🧹 Cleaning up global reCAPTCHA functions');
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
            console.log('🧹 Cleared existing CAPTCHA timeout on form submit');
        } else {
            console.log('ℹ️ No existing CAPTCHA timeout to clear');
        }

        // Check if CAPTCHA is required and not completed
        if (showCaptcha && !captchaToken) {
            console.log('🚫 CAPTCHA required but not completed - blocking request');
            console.log('📋 CAPTCHA validation failed:', {
                showCaptcha,
                captchaToken: captchaToken ? 'Present' : 'Missing'
            });
            setMessage({
                text: "Please complete the reCAPTCHA verification",
                type: "error"
            });
            return;
        }

        // Log CAPTCHA status for debugging
        if (showCaptcha) {
            console.log('✅ CAPTCHA validation passed - sending with token');
            console.log('🔐 Sending request with CAPTCHA token:', captchaToken ? 'Present' : 'Missing');
        } else {
            console.log('ℹ️ CAPTCHA not required - sending without token');
        }

        // Log current attempt count
        console.log(`📊 Login attempt ${failedAttempts + 1} - showCaptcha: ${showCaptcha}`);

        setIsLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const credentials = {
                email: formData.email,
                password: formData.password,
                remember_me: formData.rememberMe,
                ...(showCaptcha && captchaToken && { captchaToken })
            };

            // Log final credentials being sent to API
            console.log('📤 Sending credentials to API:', {
                email: credentials.email,
                password: '***', // Don't log password
                remember_me: credentials.remember_me,
                captchaToken: credentials.captchaToken ? 'Present' : 'Not included'
            });

            const response = await login(credentials);
            console.log("✅ Login successful:", response);

            if (response.success) {
                const { user, token } = response.data;

                // Reset failed attempts on successful login (CAPTCHA system)
                setFailedAttempts(0);
                setShowCaptcha(false);
                console.log('🔄 Login successful - setShowCaptcha(false)');

                // Force reset reCAPTCHA widget if it exists
                if (window.grecaptcha) {
                    try {
                        window.grecaptcha.reset();
                        console.log('✅ reCAPTCHA widget reset on successful login');
                    } catch (error) {
                        console.log('ℹ️ No reCAPTCHA widget to reset on success');
                    }
                } else {
                    console.log('ℹ️ reCAPTCHA API not available on successful login');
                }

                loginUser(user, token, formData.rememberMe);
                setMessage({ text: response.message || "Login successful!", type: "success" });

                setTimeout(() => navigate("/"), 2000);
            } else {
                // Increment failed attempts on response error
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);
                console.log(`📈 Failed attempt ${newAttempts} - showCaptcha: ${showCaptcha}`);

                // Show CAPTCHA after 3 failed attempts (session-based)
                if (newAttempts >= 3 && !showCaptcha) {
                    setShowCaptcha(true);
                    setMessage({
                        text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                        type: "error"
                    });
                    console.log(`🚨 CAPTCHA triggered after ${newAttempts} failed attempts`);
                } else {
                    setMessage({ text: response.message || "Invalid email or password", type: "error" });
                }
            }
        } catch (error) {
            console.error("❌ Login error:", error);

            // Increment failed attempts on error
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);
            console.log(`📈 Failed attempt ${newAttempts} (network error) - showCaptcha: ${showCaptcha}`);

            // Show CAPTCHA after 3 failed attempts (session-based)
            if (newAttempts >= 3 && !showCaptcha) {
                setShowCaptcha(true);
                setMessage({
                    text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                    type: "error"
                });
                console.log(`🚨 CAPTCHA triggered after ${newAttempts} failed attempts (network error)`);
            } else {
                setMessage({
                    text: error.response?.data?.message || "Error occurred during login",
                    type: "error"
                });
            }
        } finally {
            setIsLoading(false);
            console.log('📊 Login attempt finished - showCaptcha:', showCaptcha, 'captchaToken:', captchaToken ? 'Present' : 'Empty', 'message:', message.text);
        }
    };

    const handleSignUpClick = () => navigate('/signup');

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
            />
        </LayoutWrapper>
    );
};

export default Login;
