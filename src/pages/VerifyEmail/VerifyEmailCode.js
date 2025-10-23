import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { verifyEmail, resendVerificationCode } from "../../API/auth";
import "../Login/Login.css";
import "./VerifyEmail.css";
import { useNavigate, Link } from "react-router-dom";

export default function VerifyEmailCode() {
    const [code, setCode] = useState(["", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const inputsRef = useRef([]);
    const navigate = useNavigate();

    const email = localStorage.getItem("userEmail");

    // Debug: Check what's in localStorage
    console.log("🔍 VerifyEmail component loaded");
    console.log("📧 Email from localStorage:", email);
    console.log("🗂️ All localStorage items:", Object.keys(localStorage).map(key => `${key}: ${localStorage.getItem(key)}`));

    // === handle inputs ===
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

    // === handle resend code ===
    const handleResend = async () => {
        // Check if email exists before making API call
        if (!email) {
            alert("Email not found. Please try signing up again.");
            return;
        }

        try {
            setLoading(true);
            console.log("📤 Sending resend request for email:", email);

            const res = await resendVerificationCode(email);
            console.log("📥 Resend response:", res);

            alert(res.message || "Verification code resent successfully!");
        } catch (err) {
            console.error("❌ Resend error:", err);

            // Handle API errors
            if (err.response?.status === 404) {
                alert("Email verification is not available right now. You can proceed to login.");
                // Optional: redirect to login after a delay
                setTimeout(() => navigate("/login"), 3000);
            } else if (err.response?.status === 400) {
                alert(err.response?.data?.message || "Invalid email address");
            } else if (err.response?.status === 429) {
                alert(err.response?.data?.message || "Too many resend attempts");
            } else if (err.response?.status === 500) {
                alert(err.response?.data?.message || "Server error during resend");
            } else {
                alert(err.response?.data?.message || "Error resending code");
            }
        } finally {
            setLoading(false);
        }
    };

    // === handle verify code ===
    const handleVerify = async () => {
        const otp = code.join("");
        if (otp.length < 4) return alert("Please enter the 4-digit code");

        // Check if email exists
        if (!email) {
            alert("Email not found. Please try signing up again.");
            return;
        }

        try {
            setLoading(true);
            console.log("📤 Sending verification request:", { email, code: otp });

            const res = await verifyEmail(email, otp);
            console.log("📥 Verification response:", res);

            if (res.success) {
                alert(res.message || "Email verified successfully!");
                navigate("/login");
            } else {
                alert(res.message || "Invalid verification code");
            }
        } catch (err) {
            console.error("❌ Verification error:", err);

            // Handle API errors
            if (err.response?.status === 404) {
                alert("Email verification is not available right now. You can proceed to login.");
                setTimeout(() => navigate("/login"), 3000);
            } else if (err.response?.status === 400) {
                alert(err.response?.data?.message || "Invalid verification code");
            } else if (err.response?.status === 500) {
                alert(err.response?.data?.message || "Server error during verification");
            } else {
                alert(err.response?.data?.message || "Error verifying email");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="verify-email-wrapper">
            <motion.div
                className="verify-email-container"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div className="verify-email-logo text-center mb-4">
                    <motion.h1
                        className="display-4 fw-bold text-primary mb-2"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        Meetza
                    </motion.h1>
                </div>

                <div className="text-center">
                    <motion.h2
                        className="fw-semibold mb-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        Verify Email
                    </motion.h2>

                    <p className="text-muted mb-4" style={{ maxWidth: 420, fontSize: "18px" }}>
                        {email ? (
                            <>We've sent a verification code to <b>{email}</b>. Please enter it below to complete your registration.</>
                        ) : (
                            <>No email found. Please <Link to="/signup">sign up again</Link>.</>
                        )}
                    </p>

                    <div className="code-inputs" onPaste={handlePaste}>
                        {code.map((value, idx) => (
                            <input
                                key={idx}
                                type="text"
                                inputMode="numeric"
                                className="code-input form-control"
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
                        <button type="button" className="btn btn-link p-0" onClick={handleResend} disabled={loading}>
                            Request again
                        </button>
                    </div>

                    <button
                        type="button"
                        className="verify-button btn py-3 mt-1 mb-3"
                        onClick={handleVerify}
                        disabled={loading}
                    >
                        {loading ? "Verifying..." : "Verify Email"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}