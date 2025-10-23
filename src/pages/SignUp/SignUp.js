import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutWrapper from '../../components/Login&SignUp/LayoutWrapper';
import { SignUpLayout } from '../../components/Login&SignUp/SignUpLayout';
import FormSection from '../../components/Login&SignUp/FormSection';
import { signup } from "../../API/auth.js";
import { User, Password } from '@phosphor-icons/react';
import { Button, Spinner } from 'react-bootstrap';
import EmailField from '../../components/FormFields/EmailField';
import PasswordField from '../../components/FormFields/PasswordField';
import SocialLoginButtons from '../../components/FormFields/SocialLoginButtons';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import '../Login/Login.css';

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
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const [message, setMessage] = useState({ text: "", type: "" });

    const images = [
        '/assets/image 1.png',
        '/assets/image 2.png',
        '/assets/image 3.png',
        '/assets/image 4.png',
        '/assets/image 5.png'
    ];

    // Handle image carousel
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === images.length - 1 ? 0 : prevIndex + 1
            );
        }, 4000);
        return () => clearInterval(interval);
    }, [images.length]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // simple validation for username + confirm password
        if (name === 'username') {
            if (!value.trim()) {
                setErrors(prev => ({ ...prev, username: '' }));
            } else if (value.length < 3) {
                setErrors(prev => ({ ...prev, username: 'At least 3 characters' }));
            } else if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
                setErrors(prev => ({ ...prev, username: 'Name can only contain letters, numbers, and spaces' }));
            } else {
                setErrors(prev => ({ ...prev, username: '' }));
            }
        }

        if (name === 'confirmPassword') {
            if (!value.trim()) {
                setErrors(prev => ({ ...prev, confirmPassword: '' })); // مسح الأيرور لو الحقل فارغ
            } else if (value !== formData.password) {
                setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
            } else {
                setErrors(prev => ({ ...prev, confirmPassword: '' }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);

        try {
            const userData = {
                name: formData.username,
                email: formData.email,
                password: formData.password,
                role: "Member",
            };

            const response = await signup(userData);
            console.log("✅ Signup successful:", response);


            setMessage({ text: response.message || "Signup successful!", type: "success" });


            // Save email to localStorage for verification
            localStorage.setItem("userEmail", formData.email);

            setTimeout(() => {
                setMessage({ text: "", type: "" }); // Clear message before navigation
                navigate("/verify-email");
            }, 2000);
        } catch (error) {
            console.error("❌ Signup error:", error);
            setMessage({
                text: error.response?.data?.message || "Error occurred during signup",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LayoutWrapper activeTab="signup">
            <SignUpLayout
                activeTab="signup"
                setActiveTab={(tab) => navigate(tab === 'signin' ? '/login' : '/signup')}
                currentImageIndex={currentImageIndex}
                images={images}
            >
                <FormSection
                    activeTab="signup"
                    setActiveTab={(tab) => navigate(tab === 'signin' ? '/login' : '/signup')}
                    formData={formData}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    message={message}
                >

                    {/* Username Field */}
                    <div className="d-flex gx-2 mt-3 mb-1 w-100 border border-2 py-1 px-4 rounded-4 align-items-center">
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
                                className={`form-control border-0 shadow-none ${errors.username ? 'is-invalid' : ''}`}
                                style={{ backgroundColor: 'transparent', paddingBottom: '0px', paddingTop: '0px', marginBottom: '0px' }}
                            />
                        </div>
                    </div>
                    {errors.username && (
                        <div className="text-danger small mt-1" style={{ fontSize: '0.875rem', paddingLeft: '12px' }}>
                            {errors.username}
                        </div>
                    )}

                    <EmailField
                        value={formData.email}
                        onChange={handleInputChange}
                        name="email"
                        className="mt-4"
                    />

                    <PasswordField
                        value={formData.password}
                        onChange={handleInputChange}
                        name="password"
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
                                        className={`form-control border-0 shadow-none ${errors.confirmPassword ? 'is-invalid' : ''}`}
                                        style={{ backgroundColor: "transparent" , paddingBottom: '0px', paddingTop: '0px' }}
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
                        className="w-100 py-3 mb-3 position-relative"
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

                    <SocialLoginButtons />
                </FormSection>
            </SignUpLayout>
        </LayoutWrapper>
    );
};

export default SignUp;
