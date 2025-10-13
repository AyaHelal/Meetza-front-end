import { useState } from "react";
import { Envelope } from "@phosphor-icons/react";

const EmailField = ({ value, onChange, name = "email" }) => {
const [error, setError] = useState("");

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(e);
    if (!newValue.trim()) {
        setError("");
    } else if (!validateEmail(newValue)) {
        setError("Please enter a valid email address.");
    } else {
        setError("");
    }
};

return (
    <div className="w-100 mt-2 mb-2">
    {/* input container */}
    <div className="d-flex gx-2 w-100 border border-2 py-1 px-4 rounded-4 align-items-center">
        <Envelope size={32} color="#888" weight="bold" className="me-2" />

        <div className="text-start w-100">
        <label
            className="text-888888"
            style={{ fontSize: "12px", paddingLeft: "12px" }}
        >
            Email
        </label>

        <input
            type="email"
            name={name}
            value={value}
            onChange={handleChange}
            className={`form-control border-0 shadow-none ${
            error ? "is-invalid" : ""
            }`}
            style={{
            width: "100%",
            paddingTop: "0%",
            paddingBottom: "0%",
            backgroundColor: "transparent",
            outline: "none",
            boxShadow: "none",
            }}
        />
        </div>
    </div>

    {error && (
        <div
        className="text-danger small mt-1"
        style={{ fontSize: "0.875rem", paddingLeft: "12px" }}
        >
        {error}
        </div>
    )}
    </div>
);
};

export default EmailField;
