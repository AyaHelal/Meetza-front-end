import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { forgotPassword } from "../../API/auth";
import FormInput from "../../components/FormFields/FormInput";
import { Envelope } from "@phosphor-icons/react";
import "../Login/Login.css";
import "./ForgotPassword.css";

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) ? "" : "Please enter a valid email address";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const emailError = validateEmail(email);
        if (emailError) {
            setError(emailError);
            return;
        }

        try {
            setLoading(true);
            const response = await forgotPassword(email);

            setSuccess(response.message || "A verification code has been sent to your email.");
            // Store email for next page
            localStorage.setItem("resetEmail", email);

            // Redirect to verify reset code page after a short delay
            setTimeout(() => {
                navigate("/verify-reset-code");
            }, 2000);

        } catch (error) {
            console.error("Forgot password error:", error);
            if (error.response?.status === 404) {
                setError("Password reset is currently unavailable. Please contact support or try signing up again.");
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError("Failed to send reset code. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100">
            <motion.div
                className="text-center w-100"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ maxWidth: '500px' }}
            >
                <div className="w-100 d-flex flex-column align-items-center text-center justify-content-center p-4">
                    <motion.h2
                        className="fw-semibold mb-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        Forgot Password
                    </motion.h2>

                    <motion.p
                        className="text-muted mb-4"
                        style={{ fontSize: "18px" }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Enter your email to receive a reset code
                    </motion.p>

                    {/* Success Message */}
                    {success && (
                        <motion.div
                            className="alert alert-success text-center mb-3"
                            role="alert"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ maxWidth: 420, borderRadius: "12px" }}
                        >
                            {success}
                        </motion.div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            className="alert alert-danger text-center mb-3"
                            role="alert"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ maxWidth: 420, borderRadius: "12px" }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <FormInput
                            name="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            type="email"
                            label="Your Email"
                            icon={Envelope}
                            required
                            validation={validateEmail}
                        />

                        <motion.button
                            type="submit"
                            className="btn btn-primary w-100 py-3 mt-3 mb-3 rounded-4"
                            style={{ maxWidth: 420 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                        >
                            {loading ? "Sending..." : "Send Reset Code"}
                        </motion.button>

                        <div className="text-center">
                            <a href="/login" className="text-decoration-none text-muted">
                                Back to Login
                            </a>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
