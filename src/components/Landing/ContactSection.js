import { useState, useEffect, useRef } from 'react';
import { smartToast } from '../../API/toastManager';
import axiosInstance from '../../API/axiosInstance';
import FeatureCard from '../../components/FeatureCard/FeatureCard';
import './ContactSection.css';

const ContactSection = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.fullName.trim()) {
            smartToast.error('Please enter your full name');
            return;
        }
        if (!formData.email.trim()) {
            smartToast.error('Please enter your email');
            return;
        }
        if (!formData.email.includes('@')) {
            smartToast.error('Please enter a valid email address');
            return;
        }
        if (!formData.description.trim()) {
            smartToast.error('Please enter a message');
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare data in the format the backend expects
            const requestData = {
                name: formData.fullName.trim(),
                email: formData.email.trim(),
                message: formData.description.trim()
            };

            console.log('Sending contact form data:', requestData);
            const response = await axiosInstance.post('/contact', requestData);
            console.log('Contact form response:', response.data);

            if (response.data) {
                const successMessage = response.data.message || 'Message sent successfully! We will get back to you soon.';
                smartToast.success(successMessage);
                setFormData({
                    fullName: '',
                    email: '',
                    description: ''
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            console.error('Error response:', error.response?.data);

            // Show more detailed error message
            let errorMessage = 'Failed to send message. Please try again later.';
            if (error.response?.data) {
                if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            smartToast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Inject form into media-surface after render
    useEffect(() => {
        const injectForm = () => {
            // Inject form into media-surface
            if (formRef.current) {
                const mediaSurface = document.querySelector('.layout-contact .media-surface');
                if (mediaSurface && !mediaSurface.querySelector('.contact-form-container')) {
                    formRef.current.style.display = 'flex';
                    mediaSurface.appendChild(formRef.current);
                }
            }
        };

        // Try immediately
        injectForm();

        // Also try after a short delay to ensure DOM is ready
        const timeout = setTimeout(injectForm, 100);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <section id="contact-section" className="contact-section-wrapper">
            <FeatureCard
                variant="secondary"
                centerImage="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E"
                sideText={
                    <div className="contact-info-section">
                        <h2 className="contact-info-title">Get in Touch with Us</h2>
                        <p className="contact-info-text">
                            We're Here To Help You Whether You Have Questions, Need Assistance With Your Account Our Team Will Help You
                        </p>
                        <p className="contact-info-email">Email: meetza2025@gmail.com</p>
                    </div>
                }
                layoutClass="layout-contact"
                mediaFirst={false}
            />
            <div ref={formRef} className="contact-form-container" style={{ display: 'none' }}>
                <form onSubmit={handleSubmit} className="contact-form">
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder=""
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder=""
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Message</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder=""
                            rows="5"
                            required
                        />
                    </div>

                    <div className="form-submit-wrapper">
                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default ContactSection;

