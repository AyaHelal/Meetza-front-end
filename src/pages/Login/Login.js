import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutWrapper from '../../components/Login&SignUp/LayoutWrapper';
import { LoginLayout } from '../../components/Login&SignUp/LoginLayouts/LoginLayouts.js';
import { login } from "../../services/authService";
import { useBranding } from '../../context/BrandingContext';
import './Login.css';
import { AuthContext } from "../../context/AuthContext";

const Login = () => {
    const navigate = useNavigate();
    const { domains } = useBranding();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const [remainingAttempts, setRemainingAttempts] = useState(undefined);
    const [captchaRequiredByBackend, setCaptchaRequiredByBackend] = useState(false);
    const { loginUser } = useContext(AuthContext);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        } else if (domains && domains.length > 0) {
            // Domain validation: Allow branding domains OR common public domains
            const emailDomain = formData.email.split('@')[1]?.toLowerCase();
            const publicDomains = ['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
            const brandingDomains = domains.map(d => d.domain_name.toLowerCase());
            
            const isAllowed = brandingDomains.includes(emailDomain) || publicDomains.includes(emailDomain);
            
            if (!isAllowed) {
                newErrors.email = `This email domain is not authorized. Allowed domains: ${domains.map(d => d.domain_name).join(', ')} or standard public emails.`;
            }
        }

        if (!formData.password.trim()) newErrors.password = "Password is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit login. When backend asked for captcha (429), we only send token from callback.
    const submitLogin = async (recaptchaTokenToSend = null) => {
        if (!validateForm()) return;

        if (captchaRequiredByBackend && !recaptchaTokenToSend) {
            setMessage({ text: "Please complete the reCAPTCHA.", type: "error" });
            return;
        }

        setMessage({ text: "", type: "" });
        setIsLoading(true);
        setRemainingAttempts(undefined);

        const credentials = {
            email: formData.email,
            password: formData.password,
            remember_me: formData.rememberMe,
            ...(recaptchaTokenToSend && { captchaToken: recaptchaTokenToSend })
        };

        try {
            const response = await login(credentials);

            // CRITICAL: Must check for token, exactly like meetza-admin
            const actualData = response?.data || {};
            const token = actualData?.token;
            const user = actualData?.user;

            if (response?.success && token) {
                setShowCaptcha(false);
                setCaptchaToken('');
                setCaptchaRequiredByBackend(false);
                setRemainingAttempts(undefined);

                if (window.grecaptcha?.reset) {
                    try { window.grecaptcha.reset(); } catch (e) { /* ignore */ }
                }

                loginUser(user, token, formData.rememberMe);
                setMessage({ text: response.message || "Login successful!", type: "success" });

                if (typeof window !== 'undefined' && window.PasswordCredential && navigator.credentials && formData?.email && formData?.password) {
                    try {
                        const cred = new window.PasswordCredential({
                            id: formData.email,
                            password: formData.password,
                            name: user?.username || user?.name || formData.email
                        });
                        await navigator.credentials.store(cred);
                    } catch (e) { /* ignore */ }
                }

                setTimeout(() => navigate("/home"), 500);
            } else {
                // Failure case: handle security data even if status 200
                const msg = response?.message ?? actualData?.message ?? "Login failed.";
                setMessage({ text: msg, type: "error" });
                
                if (actualData.requiresCaptcha || response.requiresCaptcha) {
                    setCaptchaRequiredByBackend(true);
                    setShowCaptcha(true);
                }
                if (actualData.remaining !== undefined) {
                    setRemainingAttempts(actualData.remaining);
                }
            }
        } catch (error) {
            const res = error.response;
            const data = res?.data || {};
            const msg = data?.message ?? data?.data?.message ?? error.message ?? "Login failed. Please try again.";

            const remaining = data?.remaining;
            const needsCaptcha = data?.requiresCaptcha || (res?.status === 429);

            if (remaining !== undefined) {
                setRemainingAttempts(remaining);
            }

            if (needsCaptcha) {
                setCaptchaRequiredByBackend(true);
                setShowCaptcha(true);
                setMessage({ text: msg, type: "error" });
            } else {
                setMessage({ text: msg, type: "error" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onCaptchaVerified = (token) => {
        setMessage({ text: "", type: "" });
        setRemainingAttempts(undefined);
        setCaptchaToken(token);
        submitLogin(token);
    };

    const onCaptchaExpired = () => setCaptchaToken('');

    window.onCaptchaChange = onCaptchaVerified;
    window.onCaptchaExpired = onCaptchaExpired;

    useEffect(() => {
        if (!showCaptcha) setCaptchaToken('');
    }, [showCaptcha]);

    // Auto-scroll to reCAPTCHA when it becomes visible
    useEffect(() => {
        if (showCaptcha) {
            const scrollToCaptcha = () => {
                const captchaElement = document.querySelector('.g-recaptcha');
                if (captchaElement) captchaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                else setTimeout(scrollToCaptcha, 500);
            };
            setTimeout(scrollToCaptcha, 300);
        }
    }, [showCaptcha]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'radio' ? value : value)
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitLogin();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (captchaRequiredByBackend) return;
            submitLogin();
        }
    };

    const handleSignUpClick = () => navigate('/signup', { replace: true });
    const handleForgotPassword = () => navigate('/forgot-password');

    return (
        <LayoutWrapper activeTab="signin">
            <LoginLayout
                activeTab="signin"
                setActiveTab={handleSignUpClick}
                formData={formData}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                handleKeyDown={handleKeyDown}
                isLoading={isLoading}
                message={message}
                errors={errors}
                showCaptcha={showCaptcha}
                onCaptchaChange={onCaptchaVerified}
                onCaptchaExpired={onCaptchaExpired}
                onForgotPassword={handleForgotPassword}
                remainingAttempts={remainingAttempts}
                captchaRequiredByBackend={captchaRequiredByBackend}
                captchaToken={captchaToken}
                extraFields={null}
            />
        </LayoutWrapper>
    );
};

export default Login;
