import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../API/axiosInstance";
import BrandingLogo from "../../components/common/BrandingLogo";
import { useBranding } from "../../context/BrandingContext";
import { verifyResetCode, resendResetCode } from "../../services/authService";
import "../Login/Login.css";
import "./ForgotPassword.css";

export default function VerifyResetCode() {
    const { systemName, showPoweredBy } = useBranding();
    const isMeetza = systemName?.trim().toLowerCase() === 'meetza';
    
    const [code, setCode] = useState(["", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const inputsRef = useRef([]);
    const navigate = useNavigate();

    // Get email from localStorage
    const email = localStorage.getItem("resetEmail");

    const handleChange = (index, value) => {
        const digit = value.replace(/[^0-9]/g, "").slice(0, 1);
        const nextCode = [...code];
        nextCode[index] = digit;
        setCode(nextCode);

        if (digit && index < inputsRef.current.length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (!pasted) return;
        const next = ["", "", "", ""];
        for (let i = 0; i < Math.min(4, pasted.length); i++) {
            next[i] = pasted[i];
        }
        setCode(next);
        inputsRef.current[Math.min(pasted.length, 3)]?.focus();
    };

    const handleResend = async () => {
        if (!email) {
            setError("Email not found. Please start over.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await resendResetCode(email);
            alert("Verification code resent to your email.");
        } catch (error) {
            console.error("Resend error:", error);
            setError("Failed to resend code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        const otp = code.join("");
        if (otp.length < 4) {
            setError("Please enter the complete 4-digit code");
            return;
        }

        if (!email) {
            setError("Email not found. Please start over.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const response = await verifyResetCode(email, otp);

            if (response.success) {
                // Store verification success for next page
                localStorage.setItem("resetVerified", "true");
                navigate("/reset-password");
            } else {
                setError(response.message || "Invalid or expired code");
            }
        } catch (error) {
            console.error("Verify code error:", error);
            if (error.response?.status === 404) {
                setError("Password reset verification is currently unavailable. You can proceed to set a new password.");
                setTimeout(() => navigate("/reset-password"), 3000);
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError("Invalid or expired code");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <motion.div
                className="text-center w-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div className="w-100 d-flex flex-column align-items-center text-center justify-content-center p-2">
                    {/* Logo */}
                    <motion.div
                        className="mb-5"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <div className="d-flex flex-column align-items-center">
                            <BrandingLogo
                                showSystemName={!isMeetza}
                                className={`d-flex flex-row align-items-center justify-content-center gap-2 ${isMeetza ? "meetza-standalone-logo" : ""}`}
                                style={{
                                    maxHeight: isMeetza ? '36px' : '60px',
                                    objectFit: 'contain',
                                    margin: '0',
                                    padding: '0'
                                }}
                                systemNameStyle={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}
                            />
                            {(!isMeetza && showPoweredBy !== false) && (
                                <div className="d-flex align-items-center justify-content-center mt-1 text-muted" style={{ fontSize: '0.75rem', gap: '5px' }}>
                                    <span>Powered by</span>
                                    <div className="d-flex align-items-center" style={{ gap: '2px' }}>
                                        <img src="/assets/MeetzaLogo.png" alt="Meetza Logo" style={{ height: '18px', objectFit: 'contain' }} />
                                        <img src="/assets/MeetzaWord.png" alt="Meetza Text" style={{ height: '18px', objectFit: 'contain', marginBottom: '-1px' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h2
                        className="fw-bold mb-2 mt-0"
                        style={{
                            color: '#333',
                            fontSize: '1.8rem',
                            fontFamily: "'Poppins', sans-serif",
                            fontWeight: '600'
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Verify Reset Code
                    </motion.h2>

                    {/* Subtitle */}
                    <motion.p
                        className="text-muted mb-4"
                        style={{
                            fontSize: "1rem",
                            fontFamily: "'Poppins', sans-serif",
                            fontWeight: '400'
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        Enter the 4-digit code sent to {email || "your email"}
                    </motion.p>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            className="alert alert-danger text-center mb-3"
                            role="alert"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ maxWidth: 420, borderRadius: "12px", fontFamily: "'Poppins', sans-serif" }}
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Code Input */}
                    <motion.div
                        className="mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <div className="d-flex gap-3 justify-content-center" onPaste={handlePaste}>
                            {code.map((value, idx) => (
                                <input
                                    key={idx}
                                    type="text"
                                    inputMode="numeric"
                                    className="form-control text-center"
                                    style={{
                                        width: 60,
                                        height: 60,
                                        fontSize: 24,
                                        fontWeight: 'bold',
                                        borderRadius: '12px',
                                        border: '2px solid #e0e0e0',
                                        textAlign: 'center',
                                        backgroundColor: '#f8f9fa',
                                        fontFamily: "'Poppins', sans-serif"
                                    }}
                                    maxLength={1}
                                    value={value}
                                    onChange={(e) => handleChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    ref={(el) => (inputsRef.current[idx] = el)}
                                    disabled={loading}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* Resend Code */}
                    <motion.div
                        className="mb-4 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <span style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontWeight: '400',
                            color: '#6c757d'
                        }}>Didn't receive a code? </span>
                        <button
                            type="button"
                            className="btn btn-link text-primary p-0 text-decoration-none"
                            onClick={handleResend}
                            disabled={loading}
                            style={{
                                fontWeight: '600',
                                fontFamily: "'Poppins', sans-serif"
                            }}
                        >
                            Request again
                        </button>
                    </motion.div>

                    {/* Verify Button */}
                    <motion.button
                        type="button"
                        className="btn btn-primary w-100 py-3 mb-3"
                        style={{
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            maxWidth: 420,
                            fontFamily: "'Poppins', sans-serif"
                        }}
                        onClick={handleVerify}
                        disabled={loading}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        {loading ? "Verifying..." : "Verify Code"}
                    </motion.button>

                    {/* Back to Forgot Password */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                    >
                        <a href="/forgot-password" className="text-decoration-none text-muted" style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: '0.9rem'
                        }}>
                            Back to Forgot Password
                        </a>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}