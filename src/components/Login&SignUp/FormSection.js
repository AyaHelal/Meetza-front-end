import { motion } from 'framer-motion';

import { Button, Spinner } from 'react-bootstrap';

import EmailField from '../../components/FormFields/EmailField';

import PasswordField from '../../components/FormFields/PasswordField';

import SocialLoginButtons from '../../components/FormFields/SocialLoginButtons';

import { useEffect, useRef } from "react";
import BrandingLogo from '../common/BrandingLogo';
import { useBranding } from '../../context/BrandingContext';

import "./FormSection.css"

const FormSection = ({

    activeTab,

    setActiveTab,

    formData,

    handleInputChange,

    handleSubmit,

    handleKeyDown,

    isLoading,

    message,

    errors,

    showCaptcha,

    onForgotPassword,

    onCaptchaChange,

    onCaptchaExpired,

    remainingAttempts,

    captchaRequiredByBackend,

    captchaToken,

    children,

    extraFields

}) => {

    const formRef = useRef(null);
    const { systemName, showPoweredBy, authGoogleEnabled } = useBranding();
    const isMeetza = systemName?.trim().toLowerCase() === 'meetza';



    // Scroll to show any new elements that might have appeared

    const scrollToShowNewElements = () => {

        // Small timeout to allow the DOM to update

        setTimeout(() => {

            if (formRef.current) {

                formRef.current.scrollIntoView({

                    behavior: 'smooth',

                    block: 'nearest'

                });

            }

        }, 100);

    };



    // Call scroll handler when children change

    useEffect(() => {

        scrollToShowNewElements();

    }, [children]);



    useEffect(() => {

        const loadCaptcha = () => {

            if (window.grecaptcha && document.querySelector('.g-recaptcha')) {

                window.grecaptcha.render(document.querySelector('.g-recaptcha'), {

                    sitekey: process.env.REACT_APP_RECAPTCHA_SITE_KEY || 'your-recaptcha-site-key',

                    callback: (token) => {

                        window.onCaptchaChange && window.onCaptchaChange(token);

                    },

                    'expired-callback': () => {

                        window.onCaptchaExpired && window.onCaptchaExpired();

                    }

                });

            }

        }

        if (window.grecaptcha) {

            loadCaptcha();

        } else {

            window.onloadCallback = loadCaptcha;

        }

    }, [showCaptcha, systemName, authGoogleEnabled]);



    return (

        <motion.div

            key={activeTab}

            initial={{ opacity: 0, x: activeTab === 'signin' ? 300 : -300 }}

            animate={{ opacity: 1, x: 0 }}

            transition={{ duration: 0.6 }}

            className="w-100 d-flex flex-column justify-content-center ff"

            style={{

                maxWidth: activeTab === 'verification' ? '500px' : '450px',

                minHeight: '100vh',

                overflowY: 'auto'

            }}

        >

            <div ref={formRef} className="text-center mb-0 mt-0">

                <div className="logo-container" style={{

                    margin: '0 auto',
                    
                    width: '100%',

                    textAlign: 'center',

                }}>

                    <div className="d-flex flex-column align-items-center">
                        <BrandingLogo
                            showSystemName={!isMeetza}
                            className={isMeetza ? "meetza-standalone-logo" : ""}
                            style={{
                                width: activeTab === 'verification' ? '150px' : '200px',
                                height: 'auto',
                                maxHeight: '86px',
                                objectFit: 'contain',
                                margin: '0 auto',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '0',
                                background: 'transparent'
                            }}
                            systemNameStyle={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}
                        />
                        {(!isMeetza && showPoweredBy !== false) && (
                            <div className="d-flex align-items-center mt-0 text-muted" style={{ fontSize: '0.75rem' }}>
                                <span >Powered by</span>
                                <img src="/assets/meetza.png" alt="Meetza" style={{ height: '14px', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                </div>



                {/* Only show default title for signin/signup, hide for verification */}

                {activeTab !== 'verification' && (

                    <>

                        <h1 className="h2 fw-semibold mb-2 font-size-lg" style={{ marginBottom: '0.25rem', marginTop: '10%', fontSize: '1.75rem' }}>Welcome Back</h1>

                        <p className="text-muted p-font-size-lg" style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>

                            {formData?.role ? `Please enter your details as a ${formData.role}` : 'Please enter your details'}

                        </p>

                    </>

                )}

            </div>



            <div className="rounded-3 mb-2 btn-group-mobile" style={{ backgroundColor: '#e0e0e0' }}>

                {/* Only show tabs for signin/signup, hide for verification */}

                {activeTab !== 'verification' && (

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

                )}

            </div>



            {message?.text && (

                <div className={`login-error-container ${message.type === "success" ? "success-container" : ""}`} role="alert">

                    <div className={`login-error-icon ${message.type === "success" ? "success-icon" : ""}`}>

                        {message.type === "success" ? (

                            <span style={{ fontSize: "1.2rem" }}>✅</span>

                        ) : (

                            <div style={{

                                width: "24px",

                                height: "24px",

                                borderRadius: "50%",

                                backgroundColor: "#e54b4b",

                                display: "flex",

                                alignItems: "center",

                                justifyContent: "center",

                                color: "white",

                                fontSize: "16px",

                                fontWeight: "bold",

                                flexShrink: 0

                            }}>

                                !

                            </div>

                        )}

                    </div>

                    <div className="login-error-text">

                        <div className={`login-error-title ${message.type === "success" ? "success-title" : ""}`}>

                            {message.type === "success" ? "Success" : message.text}

                        </div>

                        <div className={`login-error-message ${message.type === "success" ? "success-message" : ""}`}>

                            Please check your credentials and try again.

                        </div>

                    </div>

                </div>

            )}



            {remainingAttempts !== undefined && (

                <div className="mb-3 text-center" style={{ maxWidth: "450px", margin: "0 auto" }}>

                    <small className="text-warning">

                        {remainingAttempts === 0 ? "No attempts remaining" : `${remainingAttempts} attempt(s) remaining`}

                    </small>

                </div>

            )}



            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown || undefined} autoComplete="on">

                {children ? (

                    children

                ) : (

                    /* Only show default form fields for signin/signup, not for verification */

                    activeTab !== 'verification' && (

                        <>

                            {/* default fields start here (extraFields will be rendered after Remember/Forgot) */}



                            <EmailField

                                value={formData.email}

                                onChange={handleInputChange}

                                name="email"

                                error={errors?.email}

                                autoFocus

                            />



                            <PasswordField

                                value={formData.password}

                                onChange={handleInputChange}

                                name="password"

                                error={errors?.password}

                            />



                            {/* render any extra fields (e.g., role radios) above the remember/forgot row */}

                            {extraFields && (

                                <div className="mb-0">

                                    {extraFields}

                                </div>

                            )}



                            <div className="d-flex justify-content-between ps-2 align-items-center mb-1">

                                {activeTab === 'signin' && (

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

                                )}



                                <button

                                    type="button"

                                    onClick={onForgotPassword}

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

                                className=" py-3 mb-3 position-relative button-submit"

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



                            {/* Show CAPTCHA if required */}

                            {showCaptcha && (

                                <div className="mb-3 d-flex justify-content-center" key={`captcha-${Date.now()}`}>

                                    <div

                                        className="g-recaptcha"

                                        data-sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LdzEfErAAAAADeiiCLtCGlNZ9YmPuSct-b1g0c2'}

                                        data-callback="window.onCaptchaChange"

                                        data-expired-callback="window.onCaptchaExpired"

                                        data-theme="light"

                                        data-size="normal"

                                    ></div>

                                </div>

                            )}



                            {authGoogleEnabled && (
                                <SocialLoginButtons redirectUrl={"https://meetza-front-end.vercel.app/home"} type={"signin"} />
                            )}

                        </>

                    )

                )}

            </form>

        </motion.div>

    );

};



export default FormSection;