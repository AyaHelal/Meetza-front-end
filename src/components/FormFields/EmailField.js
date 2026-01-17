import { Envelope } from "@phosphor-icons/react";

const EmailField = ({ value, onChange, name = "email", error = "" }) => {
    const handleChange = (e) => {
        onChange(e);
    };

    return (
        <div className="w-100 mt-1 mb-2">
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
                        autoComplete="username"
                        value={value}
                        onChange={handleChange}
                        placeholder="johndoe@email.com"
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
