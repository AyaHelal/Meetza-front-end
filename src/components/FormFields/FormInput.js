import { useState } from "react";

const FormInput = ({
    name,
    placeholder,
    value,
    onChange,
    disabled = false,
    type = "text",
    label,
    icon: Icon,
    required = false,
    validation
}) => {
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const newValue = e.target.value;
        onChange(e);

        // Custom validation if provided
        if (validation) {
            const validationError = validation(newValue);
            setError(validationError || "");
        } else if (required && !newValue.trim()) {
            setError(`${label || name} is required`);
        } else {
            setError("");
        }
    };

    return (
        <div className="w-100 mt-2 mb-2">
            <div className="d-flex gx-2 w-100 border border-2 py-1 px-4 rounded-4 align-items-center">
                {Icon && <Icon size={32} color="#888" weight="bold" className="me-2" />}

                <div className="text-start w-100">
                    {label && (
                        <label
                            className="text-888888"
                            style={{ fontSize: "12px", paddingLeft: "12px" }}
                        >
                            {label} {required && <span className="text-danger">*</span>}
                        </label>
                    )}

                    <input
                        type={type}
                        name={name}
                        placeholder={placeholder}
                        value={value}
                        onChange={handleChange}
                        disabled={disabled}
                        className={`form-control border-0 shadow-none ${error ? "is-invalid" : ""}`}
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

export default FormInput;
