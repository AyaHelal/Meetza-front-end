import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutWrapper from '../../components/Login&SignUp/LayoutWrapper';
import { SignUpLayout } from '../../components/Login&SignUp/SignUpLayout';
import FormSection from '../../components/Login&SignUp/FormSection';
import { signup } from "../../services/authService";
import { User, Password } from '@phosphor-icons/react';
import { Button, Spinner } from 'react-bootstrap';
import EmailField from '../../components/FormFields/EmailField';
import PasswordField from '../../components/FormFields/PasswordField';
import SocialLoginButtons from '../../components/FormFields/SocialLoginButtons';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import '../Login/Login.css';
import '../../components/Login&SignUp/FormSection.css';
import { useBranding } from '../../context/BrandingContext';

const SignUp = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'radio' ? value : (type === 'checkbox' ? checked : value)
        }));

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Validation logic
        const newErrors = {};

        // Username validation
        if (!formData.username.trim()) {
            newErrors.username = "Name is required";
        } else if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        } else if (!/^[a-zA-Z\s]+$/.test(formData.username)) {
            newErrors.username = "Username can only contain letters and spaces";
        }

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        } else if (!authGoogleEnabled && domains && domains.length > 0) {
            // Domain validation: Only apply when Google Auth is DISABLED
            const emailDomain = formData.email.split('@')[1]?.toLowerCase();
            const brandingDomains = domains.map(d => d.domain_name.toLowerCase());
            
            if (!brandingDomains.includes(emailDomain)) {
                newErrors.email = `This email domain is not authorized. Allowed domains: ${domains.map(d => d.domain_name).join(', ')}.`;
            }
        }

        // Password validation
        if (!formData.password.trim()) {
            newErrors.password = "Password is required";
        } else {
            const password = formData.password;
            const hasLowercase = /[a-z]/.test(password);
            const hasUppercase = /[A-Z]/.test(password);
            const hasNumber = /\d/.test(password);
            // Check for any special character (non-alphanumeric)
            const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
            const isLongEnough = password.length >= 8;

            // Debug log (remove in production if needed)

            if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar || !isLongEnough) {
                newErrors.password = "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
            }
        }

        // Confirm password validation
        if (!formData.confirmPassword.trim()) {
            newErrors.confirmPassword = "confirmPassword is required";
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }


        // If there are validation errors, set them and prevent submission
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Clear errors on successful validation
        setErrors({});

        setIsLoading(true);

        try {
            const userData = {
                name: formData.username,
                email: formData.email,
                password: formData.password
            };

            const response = await signup(userData);


            setMessage({ text: response.message || "Signup successful!", type: "success" });


            // Save email to localStorage for verification
            localStorage.setItem("userEmail", formData.email);

            setTimeout(() => {
                setMessage({ text: "", type: "" }); // Clear message before navigation
                navigate("/verify-email");
            }, 2000);
        } catch (error) {
            console.error("❌ Signup error:", error);
            console.error('Signup error response status:', error.response?.status);
            console.error('Signup error response data:', error.response?.data);

            const networkError = !error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK');
            
            setMessage({
                text: error.response?.data?.message || (networkError ? "Network Error" : "Error occurred during signup"),
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };
    const { authGoogleEnabled, domains } = useBranding();

    return (
        <LayoutWrapper activeTab="signup">
            <SignUpLayout
                activeTab="signup"
                setActiveTab={(tab) => navigate(tab === 'signin' ? '/login' : '/signup', { replace: true })}
            >
                <FormSection
                    activeTab="signup"
                    setActiveTab={(tab) => navigate(tab === 'signin' ? '/login' : '/signup', { replace: true })}
                    formData={formData}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    message={message}
                    errors={errors}
                >

                    {/* Username Field */}
                    <div className="d-flex gx-2 mt-0 w-100 border border-2 py-1 px-4 mb-2 rounded-4 align-items-center">
                        <User size={32} color="#888" weight="bold" className="me-2" />
                        <div className="text-start w-100">
                            <label className="text-888888" style={{ fontSize: "12px", paddingLeft: "12px", paddingBottom: '0px', marginBottom: '0px' }}>
                                Name
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                placeholder="Aya Helal"
                                autoComplete="username"
                                className={`form-control border-0 shadow-none ${errors.username ? 'is-invalid' : ''}`}
                                style={{ backgroundColor: 'transparent', paddingBottom: '0px', paddingTop: '0px', marginBottom: '0px' }}
                            />
                        </div>
                    </div>
                    {errors.username && (
                        <div className="text-danger small mt-0" style={{ fontSize: '0.8rem', paddingLeft: '12px' }}>
                            {errors.username}
                        </div>
                    )}

                    <EmailField
                        value={formData.email}
                        onChange={handleInputChange}
                        name="email"
                        autoComplete="email"
                        error={errors.email}
                        className="mt-3"
                    />

                    <PasswordField
                        value={formData.password}
                        onChange={handleInputChange}
                        name="password"
                        autoComplete="new-password"
                        error={errors.password}
                        showStrengthIndicator={true}
                    />

                    {/* Confirm Password Field */}
                    {formData.password && (
                        <div className="w-100 mb-2">
                            <div className="d-flex gx-2 w-100 border border-2 py-1 px-4 rounded-4 align-items-center position-relative">
                                <Password size={32} color="#888" weight="bold" className="me-2" />
                                <div className="text-start w-100">
                                    <label className="text-888888" style={{ fontSize: "12px", paddingLeft: "12px" }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="●●●●●●●●"
                                        autoComplete="new-password"
                                        className={`form-control border-0 shadow-none ${errors.confirmPassword ? 'is-invalid' : ''}`}
                                        style={{ backgroundColor: "transparent", paddingBottom: '0px', paddingTop: '0px' }}
                                    />
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="text-muted border-0 p-1 position-absolute end-0 top-50 translate-middle-y me-3"
                                        style={{
                                            outline: "none !important",
                                            boxShadow: "none !important",
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.outline = 'none';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.outline = 'none';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                    >
                                        {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                                    </Button>
                                </div>
                            </div>
                            {errors.confirmPassword && (
                                <div className="text-danger small mt-1" style={{ fontSize: '0.875rem', paddingLeft: '12px' }}>
                                    {errors.confirmPassword}
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                        className=" py-3 mb-3 position-relative button-submit"
                        style={{
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </Button>
                    {authGoogleEnabled && (
                        <SocialLoginButtons redirectUrl={"https://meetza-front-end.vercel.app/home"} type={"signup"}/>
                    )}
                </FormSection>
            </SignUpLayout>
        </LayoutWrapper>
    );
};

export default SignUp;