import { useState, useEffect } from 'react';
import LayoutWrapper from '../../components/Login/LayoutWrapper';
import { LoginLayout, SignUpLayout } from '../../components/Login/LoginLayouts';
import SignUp from '../SignUp/SignUp';
import './Login.css';

const Login = () => {
    const [activeTab, setActiveTab] = useState('signin');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    // Loading state for smooth UX
    const [isLoading, setIsLoading] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        setIsLoading(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            //await AuthService.login(formData.email, formData.password); (back)

            console.log('Form submitted:', formData);
            // call API
        } catch (error) {
            console.error('Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LayoutWrapper activeTab={activeTab}>
            {activeTab === 'signup' ? (
                <SignUpLayout
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    currentImageIndex={currentImageIndex}
                    images={images}
                >
                    <SignUp />
                </SignUpLayout>
            ) : (
                <LoginLayout
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    formData={formData}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    currentImageIndex={currentImageIndex}
                    images={images}
                />
            )}
        </LayoutWrapper>
    );
};

export default Login;