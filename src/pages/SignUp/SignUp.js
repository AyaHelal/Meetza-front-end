import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import EmailField from '../../components/FormFields/EmailField';
import PasswordField from '../../components/FormFields/PasswordField';
import SocialLoginButtons from '../../components/FormFields/SocialLoginButtons';

const SignUp = ({ setActiveTab }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('SignUp Form submitted:', formData);
        // call SignUp API
    };

    return (
        <Form onSubmit={handleSubmit}>
            {/* Username Field */}
            <Form.Group className="mb-3">
                <div className="position-relative">
                <Form.Control
                    type="text"
                    placeholder="Username"
                    className="py-3 pe-4 border-4"
                    style={{
                        borderRadius: '12px',
                        backgroundColor: '#f8f9fa',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        paddingLeft: '50px'
                    }}
                />
                <div className="position-absolute top-50 start-0 translate-middle-y ms-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
                </div>
            </Form.Group>

            <EmailField
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                name="email"
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
                type="submit"
                variant="primary"
                className="w-100 py-3 mb-3"
                style={{
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '500'
                }}
                >
                Create Account
            </Button>

            <SocialLoginButtons />
        </Form>
    );
};

export default SignUp;