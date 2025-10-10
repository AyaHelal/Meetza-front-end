import { useState, useEffect } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { User } from '@phosphor-icons/react';
import EmailField from '../../components/FormFields/EmailField';
import PasswordField from '../../components/FormFields/PasswordField';
import SocialLoginButtons from '../../components/FormFields/SocialLoginButtons';

const SignUp = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        rememberMe: false
    });

    // Error states for each field
    const [errors, setErrors] = useState({
        username: '',
        email: '',
        password: ''
    });

    // Loading state for smooth UX
    const [isLoading, setIsLoading] = useState(false);

    // Track previous errors to detect changes
    const [prevErrors, setPrevErrors] = useState({
        username: '',
        email: '',
        password: ''
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
        }));

        // Real-time validation for username field
        if (name === 'username') {
            if (!value || value.trim() === '') {
                setErrors(prev => ({ ...prev, username: '' }));
            } else if (value.length < 3) {
                setErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters long.' }));
            } else if (value.length > 20) {
                setErrors(prev => ({ ...prev, username: 'Username must not exceed 20 characters.' }));
            } else {
                setErrors(prev => ({ ...prev, username: '' }));
            }
        }
    };

    // Scroll to first error when errors change
    useEffect(() => {
        const errorsChanged = Object.keys(errors).some(key => errors[key] !== prevErrors[key]);
        if (errorsChanged) {
            // Use requestAnimationFrame for better timing
            requestAnimationFrame(() => {
                const errorElements = document.querySelectorAll('.text-danger');
                if (errorElements.length > 0) {
                    errorElements[0].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            });
            setPrevErrors(errors);
        }
    }, [errors, prevErrors]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('SignUp handleSubmit called');
        console.log('isLoading before:', isLoading);

        setIsLoading(true);
        console.log('isLoading after setState:', isLoading);

        try {
            console.log('Starting API call...');
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            //await AuthService.login(formData.email, formData.password); back-end
            console.log('API call completed');

            console.log('SignUp Form submitted:', formData);
            // call SignUp API
        } catch (error) {
            console.error('SignUp error:', error);
        } finally {
            console.log('Setting isLoading to false');
            setIsLoading(false);
        }
    };

    return (
        <Form onSubmit={(e) => e.preventDefault()} onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading) {
                handleSubmit(e);
            }
        }}>
            {/* Username Field*/}
            <div className="d-flex gx-2 mt-4 mb-2 w-100 border border-2 py-1 px-4 rounded-4 align-items-center">
                <div>
                    <User size={32} color="#888" weight="bold" className="me-2" />
                </div>
                <div className="text-start w-100">
                    <label className="text-888888" style={{ fontSize: "12px", paddingLeft: "12px" }}>
                        Username
                    </label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`form-control border-0 shadow-none ${errors.username ? 'is-invalid' : ''}`}
                        style={{
                            width: "100%",
                            paddingTop: "0%",
                            paddingBottom: "0%",
                            backgroundColor: 'transparent',
                            outline: 'none',
                            boxShadow: 'none'
                        }}
                    />
                </div>
            </div>
            {/* Username Error Message*/}
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
            />

            {/* Terms Checkbox */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <Form.Check
                type="checkbox"
                id="rememberMe"
                label="Remember me"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="text-muted small"
                />
            </div>

            {/* Submit Button */}
            <Button
                type="button"
                variant="primary"
                disabled={isLoading}
                className="w-100 py-3 mb-3 position-relative"
                style={{
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '500',
                    opacity: isLoading ? 0.7 : 1
                }}
                onClick={handleSubmit}
            >
                {isLoading ? (
                    <>
                        <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                        />
                        Creating Account...
                    </>
                ) : (
                    'Create Account'
                )}
            </Button>

            <SocialLoginButtons />
        </Form>
    );
};

export default SignUp;