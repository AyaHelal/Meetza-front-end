import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LayoutWrapper from "../../components/Login&SignUp/LayoutWrapper";
import { LoginLayout } from "../../components/Login&SignUp/LoginLayouts";
import { verifyResetCode, resendResetCode } from "../../API/auth";
import FormSection from "../../components/Login&SignUp/FormSection";
import { Button, Spinner } from 'react-bootstrap';
import "../Login/Login.css";
import "../../components/Login&SignUp/LoginLayouts.css";

export default function VerifyResetCode() {
    const [code, setCode] = useState(["", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
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
            setMessage({ text: "Email not found. Please start over.", type: "error" });
            return;
        }

        try {
            setLoading(true);
            setMessage({ text: "", type: "" });
            await resendResetCode(email);
            setMessage({ text: "Verification code resent to your email.", type: "success" });
        } catch (error) {
            console.error("Resend error:", error);
            setMessage({ text: "Failed to resend code. Please try again.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        const otp = code.join("");
        if (otp.length < 4) {
            setMessage({ text: "Please enter the complete 4-digit code", type: "error" });
            return;
        }

        if (!email) {
            setMessage({ text: "Email not found. Please start over.", type: "error" });
            return;
        }

        try {
            setLoading(true);
            setMessage({ text: "", type: "" });
            const response = await verifyResetCode(email, otp);

            if (response.success) {
                // Store verification success for next page
                localStorage.setItem("resetVerified", "true");
                setMessage({ text: "Code verified successfully!", type: "success" });
                setTimeout(() => navigate("/reset-password"), 2000);
            } else {
                setMessage({ text: response.message || "Invalid or expired code", type: "error" });
            }
        } catch (error) {
            console.error("Verify code error:", error);
            if (error.response?.status === 404) {
                setMessage({ text: "Password reset verification is currently unavailable. Please contact support.", type: "error" });
            } else if (error.response?.data?.message) {
                setMessage({ text: error.response.data.message, type: "error" });
            } else {
                setMessage({ text: "Invalid or expired code", type: "error" });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackToForgot = () => {
        navigate("/forgot-password");
    };

    return (
        <LayoutWrapper>
            <LoginLayout activeTab="verification">
                <FormSection
                    activeTab="verification"
                    formData={{}}
                    handleInputChange={() => {}}
                    handleSubmit={() => {}}
                    isLoading={loading}
                    message={message}
                >
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h1 className="h3 fw-bold mb-2">Verify Email</h1>
                        <p className="text-muted">Enter the 4-digit code sent to your email</p>
                    </div>

                    {/* Error/Success Messages */}
                    {message?.text && (
                        <div
                            className={`alert d-flex align-items-center justify-content-center text-center mb-3 ${
                                message.type === "success" ? "alert-success" : "alert-danger"
                            }`}
                            role="alert"
                            style={{
                                fontSize: "1rem",
                                fontWeight: "500",
                                gap: "10px",
                                borderRadius: "12px",
                                maxWidth: "450px",
                                margin: "10px auto"
                            }}
                        >
                            {message.type === "success" ? (
                                <span style={{ fontSize: "1.4rem" }}>✅</span>
                            ) : (
                                <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                            )}
                            <span>{message.text}</span>
                        </div>
                    )}

                    {/* Email Display */}
                    <div className="mb-3 text-center">
                        <div className="form-control-plaintext text-center" style={{
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            color: '#007bff'
                        }}>
                            📧 {email}
                        </div>
                    </div>

                    {/* Code Input */}
                    <div className="mb-4">
                        <label className="form-label text-center d-block mb-3">
                            Enter Verification Code
                        </label>
                        <div className="d-flex gap-2 justify-content-center" onPaste={handlePaste}>
                            {code.map((value, idx) => (
                                <input
                                    key={idx}
                                    type="text"
                                    inputMode="numeric"
                                    className="form-control text-center"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        fontSize: 24,
                                        borderRadius: '8px',
                                        border: '2px solid #e0e0e0',
                                        textAlign: 'center'
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
                    </div>

                    {/* Resend Code */}
                    <div className="mb-3 text-center">
                        <span className="text-muted">Didn't receive a code? </span>
                        <button
                            type="button"
                            className="btn btn-link text-primary p-0 text-decoration-none"
                            onClick={handleResend}
                            disabled={loading}
                            style={{ fontWeight: '500' }}
                        >
                            Request again
                        </button>
                    </div>

                    {/* Verify Button */}
                    <Button
                        type="button"
                        variant="primary"
                        disabled={loading}
                        className="w-100 py-3 mb-3"
                        style={{
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            opacity: loading ? 0.7 : 1
                        }}
                        onClick={handleVerify}
                    >
                        {loading ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Verifying...
                            </>
                        ) : (
                            'Verify Code'
                        )}
                    </Button>

                    {/* Back Button */}
                    <div className="text-center">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={handleBackToForgot}
                            disabled={loading}
                            style={{ borderRadius: '8px' }}
                        >
                            ← Back to Forgot Password
                        </button>
                    </div>
                </FormSection>
            </LoginLayout>
        </LayoutWrapper>
    );
}
