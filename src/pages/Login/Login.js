import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutWrapper from '../../components/Login&SignUp/LayoutWrapper';
import { LoginLayout } from '../../components/Login&SignUp/LoginLayouts';
import { login } from "../../API/auth.js";
import './Login.css';
import { AuthContext } from "../../context/AuthContext";

/**
 * CAPTCHA BEHAVIOR:
 * 1. Counter starts at 0 on every page load/refresh
 * 2. Each failed login attempt increments the counter
 * 3. CAPTCHA appears after exactly 3 failed attempts
 * 4. Counter resets to 0 on successful login (including after CAPTCHA)
 * 5. Counter resets to 0 after 24 hours
 * 6. Counter persists across page refreshes within 24 hours
 *
 * This ensures CAPTCHA appears every 3 failed attempts and resets after success.
 */

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

    // Reset failed attempts counter on every page load/refresh
    // This ensures CAPTCHA appears after every 3 failed attempts
    useEffect(() => {
        const resetAttemptsOnLoad = () => {
            const storedAttempts = localStorage.getItem('loginFailedAttempts');
            const storedTimestamp = localStorage.getItem('loginFailedTimestamp');

            if (storedAttempts && storedTimestamp) {
                const timeDiff = Date.now() - parseInt(storedTimestamp);
                const hoursDiff = timeDiff / (1000 * 60 * 60);

                // Reset counter after 24 hours only
                if (hoursDiff >= 24) {
                    localStorage.removeItem('loginFailedAttempts');
                    localStorage.removeItem('loginFailedTimestamp');
                    setFailedAttempts(0);
                    setShowCaptcha(false);
                } else {
                    // Keep the counter if within 24 hours
                    const attempts = parseInt(storedAttempts);
                    setFailedAttempts(attempts);
                    setShowCaptcha(attempts >= 3);
                }
            } else {
                // No previous attempts, start fresh
                setFailedAttempts(0);
                setShowCaptcha(false);
            }
        };

        resetAttemptsOnLoad();
    }, []); // Empty dependency array means it runs on every mount (page load/refresh)

    // reCAPTCHA callback functions
    const onCaptchaChange = (token) => {
        setCaptchaToken(token);
    };

    const onCaptchaExpired = () => {
        setCaptchaToken('');
    };

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

        // Check if CAPTCHA is required and not completed
        if (showCaptcha && !captchaToken) {
            setMessage({
                text: "Please complete the reCAPTCHA verification",
                type: "error"
            });
            return;
        }

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

                // Reset failed attempts on successful login (including after CAPTCHA)
                localStorage.removeItem('loginFailedAttempts');
                localStorage.removeItem('loginFailedTimestamp');
                setFailedAttempts(0);
                setShowCaptcha(false);

                loginUser(user, token, formData.rememberMe);
                setMessage({ text: response.message || "Login successful!", type: "success" });

                setTimeout(() => navigate("/"), 2000);
            } else {
                // Increment failed attempts on response error
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);

                // Save to localStorage with timestamp
                localStorage.setItem('loginFailedAttempts', newAttempts.toString());
                localStorage.setItem('loginFailedTimestamp', Date.now().toString());

                // Show CAPTCHA after 3 failed attempts (resets on page refresh)
                if (newAttempts >= 3 && !showCaptcha) {
                    setShowCaptcha(true);
                    setMessage({
                        text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                        type: "error"
                    });
                } else {
                    // Display error message for invalid credentials
                    setMessage({ text: response.message || "Invalid email or password", type: "error" });
                }
            }
        } catch (error) {
            console.error("❌ Login error:", error);

            // Increment failed attempts on error
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);

            // Save to localStorage with timestamp
            localStorage.setItem('loginFailedAttempts', newAttempts.toString());
            localStorage.setItem('loginFailedTimestamp', Date.now().toString());

            // Show CAPTCHA after 3 failed attempts (resets on page refresh)
            if (newAttempts >= 3 && !showCaptcha) {
                setShowCaptcha(true);
                setMessage({
                    text: "Too many failed attempts. Please complete the CAPTCHA verification.",
                    type: "error"
                });
            } else {
                setMessage({
                    text: error.response?.data?.message || "Error occurred during login",
                    type: "error"
                });
            }
        } finally {
            setIsLoading(false);
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
