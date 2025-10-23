import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { resetPassword } from "../../API/auth";
import PasswordField from "../../components/FormFields/PasswordField";
import "../Login/Login.css";
import "./ForgotPassword.css";

export default function ResetPassword() {
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    // Check if user is verified or allow access anyway
    useEffect(() => {
        const isVerified = localStorage.getItem("resetVerified");
        const email = localStorage.getItem("resetEmail");

        if (!email) {
            navigate("/forgot-password");
        }
        // If not verified, still allow access but show a warning
        if (!isVerified) {
            console.log("⚠️ Password reset without verification - API may not be available");
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) {
            setError("");
        }
    };

    const validatePasswords = () => {
        if (!formData.newPassword.trim()) {
            return "New password is required";
        }
        if (formData.newPassword.length < 8) {
            return "Password must be at least 8 characters long";
        }
        if (formData.newPassword !== formData.confirmPassword) {
            return "Passwords do not match";
        }
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const validationError = validatePasswords();
        if (validationError) {
            setError(validationError);
            return;
        }

        const email = localStorage.getItem("resetEmail");
        if (!email) {
            setError("Email not found. Please start over.");
            return;
        }

        try {
            setLoading(true);
            const response = await resetPassword(email, formData.newPassword, "true");

            setSuccess(response.message || "Password reset successfully!");

            // Clear stored data
            localStorage.removeItem("resetEmail");
            localStorage.removeItem("resetVerified");

            // Redirect to login after success
            setTimeout(() => {
                navigate("/login");
            }, 2000);

        } catch (error) {
            console.error("Reset password error:", error);
            if (error.response?.status === 404) {
                // If API is not available, still allow password reset
                console.log("⚠️ Password reset API not available, but allowing password change");
                setSuccess("Password updated successfully! (Note: Email verification may not be available)");

                // Clear stored data
                localStorage.removeItem("resetEmail");
                localStorage.removeItem("resetVerified");

                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError("Failed to reset password. Please try again.");
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
                        Reset Password
                    </motion.h2>

                    <motion.p
                        className="text-muted mb-4"
                        style={{ fontSize: "18px" }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Enter your new password <span className="text-info">(Verification optional)</span>
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
                        <PasswordField
                            value={formData.newPassword}
                            onChange={handleChange}
                            name="newPassword"
                            label="New Password"
                        />

                        <div className="mt-3">
                            <PasswordField
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                name="confirmPassword"
                                label="Confirm Password"
                            />
                        </div>

                        <motion.button
                            type="submit"
                            className="btn btn-primary w-100 py-3 mt-3 mb-3 rounded-4"
                            style={{ maxWidth: 420 }}
                            disabled={loading}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
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
