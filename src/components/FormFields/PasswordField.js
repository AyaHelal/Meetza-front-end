import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Password } from '@phosphor-icons/react';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

const PasswordField = ({ value, onChange, name = "password", showStrengthIndicator = false, label = "Password", error }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="w-100 mb-2">
            {/* Input container */}
            <div className="d-flex gx-2 w-100 border border-2 py-1 px-4 rounded-4 align-items-center">
                <div>
                    <Password size={32} color="#888" weight="bold" className="me-2" />
                </div>

                <div className="text-start w-100">
                    <label
                        className="text-888888"
                        style={{ fontSize: "12px", paddingLeft: "12px" }}
                    >
                        {label}
                    </label>

                    <input
                        type={showPassword ? "text" : "password"}
                        name={name}
                        autoComplete="current-password"
                        value={value}
                        onChange={onChange}
                        placeholder="●●●●●●●●"
                        className={`form-control border-0 shadow-none ${error ? "is-invalid" : ""}`}
                        style={{
                            width: "100%",
                            paddingTop: "0%",
                            paddingBottom: "0%",
                            backgroundColor: "transparent",
                            outline: "none",
                            boxShadow: "none",
                            color: "#212529",
                            WebkitAppearance: "none",
                            MozAppearance: "textfield",
                        }}
                    />
                </div>

                {/* Eye / EyeSlash Button */}
                <Button
                    type="button"
                    variant="link"
                    className="text-muted border-0 p-0 ms-2"
                    style={{
                        outline: "none",
                        boxShadow: "none",
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </Button>
            </div>

            {error && (
                <div
                    className="text-danger small mt-1"
                    style={{ fontSize: "0.875rem", paddingLeft: "12px" }}
                >
                    {error}
                </div>
            )}

            {/* Password Strength Indicator */}
            {showStrengthIndicator && <PasswordStrengthIndicator password={value} />}
        </div>
    );
};

export default PasswordField;
