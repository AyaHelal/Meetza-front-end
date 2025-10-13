import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutWrapper from '../../components/Login/LayoutWrapper';
import { LoginLayout } from '../../components/Login/LoginLayouts';
import { login } from "../../API/auth.js";
import './Login.css';
import { AuthContext } from "../../context/AuthContext";

const Login = () => {
    const navigate = useNavigate();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const { loginUser } = useContext(AuthContext);

    const images = [
        '/assets/image 1.png',
        '/assets/image 2.png',
        '/assets/image 3.png',
        '/assets/image 4.png',
        '/assets/image 5.png'
    ];

    // handle image carousel effect
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
            const credentials = {
                email: formData.email,
                password: formData.password,
            };

            const response = await login(credentials);
            console.log("✅ Login successful:", response);

            if (response.success) {
                const { user, token } = response.data;

                loginUser(user, token);
                localStorage.setItem("token", token);

                setMessage({ text: response.message || "Login successful!", type: "success" });

                setTimeout(() => navigate("/"), 2000);
            } else {
                setMessage({ text: response.message || "Invalid email or password", type: "error" });
            }
        } catch (error) {
            console.error("❌ Login error:", error);
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
            />
        </LayoutWrapper>
    );
};

export default Login;
