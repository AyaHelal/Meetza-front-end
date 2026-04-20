import React from "react";
import FeatureCard from '../../components/FeatureCard/FeatureCard';
import ContactForm from "../Contact/ContactForm";
import './ContactSection.css';

const ContactSection = () => {
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
                media={<ContactForm mode="landing" className="contact-form-embed" />}
            />
        </section>
    );
};

export default ContactSection;

