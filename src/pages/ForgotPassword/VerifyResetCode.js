import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { verifyResetCode, resendResetCode } from "../../API/auth";
import "../Login/Login.css";
import "./ForgotPassword.css";

export default function VerifyResetCode() {
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
                        Verify Reset Code
                    </motion.h2>

                    <motion.p
                        className="text-muted mb-4"
                        style={{ fontSize: "18px" }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Enter the 4-digit code sent to {email || "your email"} <span className="text-info">(Verification optional)</span>
                    </motion.p>

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

                    <div className="d-flex gap-2 mb-3 justify-content-center" onPaste={handlePaste}>
                        {code.map((value, idx) => (
                            <input
                                key={idx}
                                type="text"
                                inputMode="numeric"
                                className="form-control text-center"
                                style={{ width: 56, height: 56, fontSize: 24 }}
                                maxLength={1}
                                value={value}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                ref={(el) => (inputsRef.current[idx] = el)}
                                disabled={loading}
                            />
                        ))}
                    </div>

                    <div className="mb-4 d-flex align-items-center justify-content-center gap-1">
                        <span>Didn't receive a code?</span>
                        <button
                            type="button"
                            className="btn btn-link p-0"
                            onClick={handleResend}
                            disabled={loading}
                        >
                            Request again
                        </button>
                    </div>

                    <div className="mb-4 text-center">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                                alert("You can proceed to set a new password.");
                                navigate("/reset-password");
                            }}
                            disabled={loading}
                        >
                            Skip Verification
                        </button>
                        <p className="text-muted small mt-2">Verification is optional for password reset.</p>
                    </div>

                    <motion.button
                        type="button"
                        className="btn btn-primary w-100 py-3 mt-1 mb-3 rounded-4"
                        style={{ maxWidth: 420 }}
                        onClick={handleVerify}
                        disabled={loading}
                    >
                        {loading ? "Verifying..." : "Verify Code"}
                    </motion.button>

                    <div className="text-center">
                        <a href="/forgot-password" className="text-decoration-none text-muted">
                            Back to Forgot Password
                        </a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}