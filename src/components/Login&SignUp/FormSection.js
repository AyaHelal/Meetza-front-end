import { motion } from 'framer-motion';
import { Button, Spinner } from 'react-bootstrap';
import EmailField from '../FormFields/EmailField';
import PasswordField from '../FormFields/PasswordField';
import SocialLoginButtons from '../FormFields/SocialLoginButtons';


const FormSection = ({
    activeTab,
    setActiveTab,
    formData,
    handleInputChange,
    handleSubmit,
    isLoading,
    message
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            className="w-100"
            style={{ maxWidth: '450px' }}
        >
            <div className="text-center mb-0 mt-5">
                <div className="logo-container">
                    <img src="/assets/meetza.png" alt="Meetza" style={{
                        maxWidth: '250px',
                        height: '200px',
                        margin: '0',
                        padding: '0',
                        background: 'transparent'
                    }} />
                </div>

                <h1 className="h2 fw-bold mb-2">Welcome Back</h1>
                <p className="text-muted">Please enter your Details as a Member</p>
            </div>

            <div className="rounded-3 p-1 mb-3" style={{ backgroundColor: '#e0e0e0' }}>
                <div className="d-flex gap-1">
                    <Button
                        variant={activeTab === 'signin' ? 'white' : 'light'}
                        className={`flex-fill py-2 border-0 ${activeTab === 'signin' ? 'shadow-sm' : ''}`}
                        style={{
                            borderRadius: '8px',
                            backgroundColor: activeTab === 'signin' ? '#ffffff' : 'transparent',
                            color: activeTab === 'signin' ? '#000' : '#6c757d',
                            fontWeight: activeTab === 'signin' ? '500' : '400'
                        }}
                        onClick={() => setActiveTab('signin')}
                    >
                        Sign In
                    </Button>
                    <Button
                        variant={activeTab === 'signup' ? 'white' : 'light'}
                        className={`flex-fill py-2 border-0 ${activeTab === 'signup' ? 'shadow-sm' : ''}`}
                        style={{
                            borderRadius: '8px',
                            backgroundColor: activeTab === 'signup' ? '#ffffff' : 'transparent',
                            color: activeTab === 'signup' ? '#000' : '#6c757d',
                            fontWeight: activeTab === 'signup' ? '500' : '400'
                        }}
                        onClick={() => setActiveTab('signup')}
                    >
                        Sign up
                    </Button>
                </div>
            </div>

            {message?.text && (
                <div
                    className={`alert d-flex align-items-center justify-content-center text-center ${
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
                    {message.type === "success" ? <span>✅</span> : <span>⚠️</span>}
                    <span>{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>

                <EmailField
                    value={formData.email}
                    onChange={handleInputChange}
                    name="email"
                    autoFocus
                />

                <PasswordField
                    value={formData.password}
                    onChange={handleInputChange}
                    name="password"
                />

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            name="rememberMe"
                            checked={formData.rememberMe}
                            onChange={handleInputChange}
                            style={{ marginRight: "4px" }}
                        />
                        <label htmlFor="rememberMe" className="text-muted small mb-0">
                            Remember me
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={() => console.log('Forgot password clicked')}
                        className="btn btn-link text-muted text-decoration-none small p-0"
                        style={{ outline: 'none', boxShadow: 'none' }}
                    >
                        Forgot Password ?
                    </button>
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                    className="w-100 py-3 mb-3 position-relative"
                    style={{
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '500',
                        opacity: isLoading ? 0.7 : 1
                    }}
                >
                    {isLoading ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                            />
                            Signing In...
                        </>
                    ) : (
                        'Continue'
                    )}
                </Button>

                <SocialLoginButtons />
            </form>
        </motion.div>
    );
};

export default FormSection;
