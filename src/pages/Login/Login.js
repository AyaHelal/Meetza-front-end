import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { motion} from 'framer-motion';
import SignUp from '../SignUp/SignUp';
import EmailField from '../../components/FormFields/EmailField';
import PasswordField from '../../components/FormFields/PasswordField';
import SocialLoginButtons from '../../components/FormFields/SocialLoginButtons';
import './Login.css';

const Login = () => {
    const [activeTab, setActiveTab] = useState('signin');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const images = [
        '/assets/image 1.png',
        '/assets/image 2.png',
        '/assets/image 3.png',
        '/assets/image 4.png',
        '/assets/image 5.png'
    ];

    //handle image carousel effect
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
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        // call API
    };

    return (
        <div className="login-page-wrapper">
            <Container fluid className="p-0">
                <Row className="g-0">
                    {/* Left Side - Form */}
                    <Col lg={6} className="d-flex align-items-center justify-content-center bg-white p-0 m-0">
                        <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-100"
                        style={{ maxWidth: '450px' }}
                        >

                    <div className="text-center mb-0">
                        {/* Logo */}
                        <div className="logo-container">
                            <img src="/assets/meetza.png" alt="Meetza" style={{
                                maxWidth: '250px',
                                height: '200px',
                                margin: '0',
                                padding: '0',
                                background: 'transparent'
                            }} />
                        </div>

                        {/* Welcome Text */}
                        <h1 className="h2 fw-bold mb-2">Welcome Back</h1>
                        <p className="text-muted">Please enter your Details as a Member</p>
                    </div>

                    {/* Tabs */}
                    <div className="rounded-3 p-1 mb-3" style={{ backgroundColor: '#e0e0e0' }}>
                        <div className="d-flex gap-1">
                            <Button
                                variant={activeTab === 'signin' ? 'white' : 'light'}
                                className={`flex-fill py-2 border-0 ${activeTab === 'signin' ? 'shadow-sm' : ''}`}
                                style={{
                                    borderRadius: '8px',
                                    backgroundColor: activeTab === 'signin' ? '#ffffff' : 'transparent',
                                    color: activeTab === 'signin' ? '#000' : '#6c757d',
                                    fontWeight: activeTab === 'signin' ? '500' : '400'
                                }}
                                onClick={() => setActiveTab('signin')}
                            >
                                Sign In
                            </Button>
                            <Button
                                variant={activeTab === 'signup' ? 'white' : 'light'}
                                className={`flex-fill py-2 border-0 ${activeTab === 'signup' ? 'shadow-sm' : ''}`}
                                style={{
                                    borderRadius: '8px',
                                    backgroundColor: activeTab === 'signup' ? '#ffffff' : 'transparent',
                                    color: activeTab === 'signup' ? '#000' : '#6c757d',
                                    fontWeight: activeTab === 'signup' ? '500' : '400'
                                }}
                                onClick={() => setActiveTab('signup')}
                            >
                                Sign up
                            </Button>
                        </div>
                    </div>

                    {/* Form */}
                    <Form onSubmit={handleSubmit}>
                        {activeTab === 'signup' ? (
                            <SignUp setActiveTab={setActiveTab} />
                        ) : (
                            <>
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
                                    <button
                                        type="button"
                                        onClick={() => console.log('Forgot password clicked')}
                                        className="btn btn-link text-muted text-decoration-none small p-0"
                                    >
                                        Forgot Password ?
                                    </button>
                                </div>

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
                                    Continue
                                </Button>

                                <SocialLoginButtons />
                            </>
                        )}
                    </Form>
                    </motion.div>
                </Col>

                {/* Right Side - Illustration */}
                <Col lg={6} className="d-none d-lg-flex align-items-center justify-content-center p-0">
                    <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="position-relative d-flex align-items-center justify-content-center"
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: 'translateY(-15px)'
                    }}
                    >
                        {/* Image Carousel */}
                        <div className="position-relative h-100 d-flex align-items-center justify-content-center">
                            <motion.img
                                src={images[currentImageIndex]}
                                alt="Illustration"
                                initial={{ opacity: 0.8 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="img-fluid carousel-image"
                                style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))'
                                }}
                            />
                        </div>

                        {/* Dots Indicator */}
                        <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 d-flex gap-2">
                            {images.map((_, index) => (
                            <motion.div
                                key={index}
                                className="rounded-circle bg-white"
                                style={{
                                width: currentImageIndex === index ? '24px' : '8px',
                                height: '8px',
                                opacity: currentImageIndex === index ? 1 : 0.5,
                                cursor: 'pointer'
                                }}
                                onClick={() => setCurrentImageIndex(index)}
                                whileHover={{ scale: 1.2 }}
                                transition={{ duration: 0.3 }}
                            />
                            ))}
                        </div>
                    </motion.div>
                </Col>
            </Row>
        </Container>
        </div>
    );
};

export default Login;