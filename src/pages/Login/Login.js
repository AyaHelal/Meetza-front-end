import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaEyeSlash, FaFacebook, FaGithub } from 'react-icons/fa';
import './Login.css';

const Login = () => {
    const [activeTab, setActiveTab] = useState('signin');
    const [showPassword, setShowPassword] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const images = [
        '/assets/image 1.png',
        '/assets/image 2.png',
        '/assets/image 3.png'
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
        <Container fluid className="p-0">
            <Row className="g-0">
                {/* Left Side - Form */}
                <Col lg={6} className="d-flex align-items-center justify-content-center bg-white p-3">
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
                        {activeTab === 'signup' && (
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
                        )}

                        <Form.Group className="mb-3">
                        <div className="position-relative">
                            <Form.Control
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="py-3 pe-4 border-4"
                            style={{
                                borderRadius: '12px',
                                backgroundColor: '#f8f9fa',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                paddingLeft: '50px'
                            }}
                            />
                            <div className="position-absolute top-50 start-0 translate-middle-y ms-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-envelope text-muted" viewBox="0 0 16 16">
                                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
                                </svg>
                            </div>
                        </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                        <div className="position-relative">
                            <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="••••••••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="py-3 pe-5 border-4"
                            style={{
                                borderRadius: '12px',
                                backgroundColor: '#f8f9fa',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                paddingLeft: '50px'
                            }}
                            />
                            <div className="position-absolute top-50 start-0 translate-middle-y ms-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-shield-lock text-muted" viewBox="0 0 16 16">
                                    <path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
                                    <path d="M9.5 6.5a1.5 1.5 0 0 1-1 1.415l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99a1.5 1.5 0 1 1 2-1.415"/>
                                </svg>
                            </div>
                            <Button
                            variant="link"
                            className="position-absolute top-50 end-0 translate-middle-y text-muted border-0"
                            onClick={() => setShowPassword(!showPassword)}
                            >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                        </div>
                        </Form.Group>

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

                        <p className="text-center text-muted small mb-3">Or continue with</p>

                        <div className="d-flex justify-content-center gap-3 mb-0">
                        <Button
                            variant="outline-secondary"
                            className="rounded-circle p-2 border"
                            style={{
                                width: '55px',
                                height: '55px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        >
                            <svg width="26" height="26" viewBox="0 0 24 24">
                                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        </Button>
                        <Button
                            variant="outline-secondary"
                            className="rounded-circle p-2 border"
                            style={{
                                width: '55px',
                                height: '55px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                color: '#1877f2'
                            }}
                        >
                            <FaFacebook size={26} />
                        </Button>
                        <Button
                            variant="outline-secondary"
                            className="rounded-circle p-2 border"
                            style={{
                                width: '55px',
                                height: '55px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                color: '#333333'
                            }}
                        >
                            <FaGithub size={26} />
                        </Button>
                        </div>
                    </Form>
                    </motion.div>
                </Col>

                {/* Right Side - Illustration */}
                <Col lg={6} className="d-none d-lg-flex align-items-center justify-content-center p-4">
                    <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="position-relative"
                    style={{ width: '100%', maxWidth: '500px' }}
                    >
                        <Card className="border-0 shadow-lg" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                            <Card.Body className="p-0 position-relative" style={{ height: '600px' }}>
                                {/* Background Animation */}
                                <motion.div
                                    className="position-absolute w-100 h-100"
                                    animate={{
                                    background: [
                                        'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                                        'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
                                        'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                                        'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
                                    ]
                                    }}
                                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                                />

                                {/* Image Carousel */}
                                <div className="position-relative h-100 d-flex align-items-center justify-content-center">
                                    <AnimatePresence mode="wait">
                                    <motion.img
                                        key={currentImageIndex}
                                        src={images[currentImageIndex]}
                                        alt="Illustration"
                                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                                        className="img-fluid"
                                        style={{
                                        maxWidth: '85%',
                                        maxHeight: '85%',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))'
                                        }}
                                    />
                                    </AnimatePresence>
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
                            </Card.Body>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;