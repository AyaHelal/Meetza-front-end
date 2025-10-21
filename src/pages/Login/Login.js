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

    // Load failed attempts from localStorage on component mount
    useEffect(() => {
        const storedAttempts = localStorage.getItem('loginFailedAttempts');
        const storedTimestamp = localStorage.getItem('loginFailedTimestamp');

        if (storedAttempts && storedTimestamp) {
            const timeDiff = Date.now() - parseInt(storedTimestamp);
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            // Reset counter after 24 hours
            if (hoursDiff >= 24) {
                localStorage.removeItem('loginFailedAttempts');
                localStorage.removeItem('loginFailedTimestamp');
                setFailedAttempts(0);
                setShowCaptcha(false);
            } else {
                const attempts = parseInt(storedAttempts);
                setFailedAttempts(attempts);
                setShowCaptcha(attempts >= 3);
            }
        }
    }, []);

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

                // Reset failed attempts on successful login
                localStorage.removeItem('loginFailedAttempts');
                localStorage.removeItem('loginFailedTimestamp');
                setFailedAttempts(0);
                setShowCaptcha(false);

                loginUser(user, token, formData.rememberMe);
                setMessage({ text: response.message || "Login successful!", type: "success" });

                setTimeout(() => navigate("/"), 2000);
            } else {
                // Increment failed attempts
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);

                // Save to localStorage
                localStorage.setItem('loginFailedAttempts', newAttempts.toString());
                localStorage.setItem('loginFailedTimestamp', Date.now().toString());

                // Show CAPTCHA after 3 failed attempts
                if (newAttempts >= 3 && !showCaptcha) {
                    setShowCaptcha(true);
                }

                setMessage({ text: response.message || "Invalid email or password", type: "error" });
            }
        } catch (error) {
            console.error("❌ Login error:", error);

            // Increment failed attempts on error
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);

            // Save to localStorage
            localStorage.setItem('loginFailedAttempts', newAttempts.toString());
            localStorage.setItem('loginFailedTimestamp', Date.now().toString());

            // Show CAPTCHA after 3 failed attempts
            if (newAttempts >= 3 && !showCaptcha) {
                setShowCaptcha(true);
            }

            setMessage({
                text: error.response?.data?.message || "Error occurred during login",
                type: "error"
            });
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
