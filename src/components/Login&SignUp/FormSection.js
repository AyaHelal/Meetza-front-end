import { motion } from 'framer-motion';
import { Button, Spinner } from 'react-bootstrap';
import EmailField from '../../components/FormFields/EmailField';
import PasswordField from '../../components/FormFields/PasswordField';
import SocialLoginButtons from '../../components/FormFields/SocialLoginButtons';
import { useEffect, useLayoutEffect, useRef, useMemo, useState } from "react";
import BrandingLogo from '../common/BrandingLogo';
import { useBranding } from '../../context/BrandingContext';
import "./FormSection.css";

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
    const isElementFullyVisibleIn = (container, el, padding = 8) => {
        if (!container || !el) return true;
        const cr = container.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        return (
            er.top >= cr.top + padding &&
            er.bottom <= cr.bottom - padding
        );
    };

    const sectionRootRef = useRef(null);
    const messageBannerRef = useRef(null);
    const remainingAttemptsRef = useRef(null);
    const [isResponsiveView, setIsResponsiveView] = useState(false);
    const { systemName, showPoweredBy, authGoogleEnabled } = useBranding();
    const isMeetza = systemName?.trim().toLowerCase() === 'meetza';

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(max-width: 1199px)');
        const updateResponsive = () => setIsResponsiveView(mediaQuery.matches);
        updateResponsive();
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateResponsive);
            return () => mediaQuery.removeEventListener('change', updateResponsive);
        }
        mediaQuery.addListener(updateResponsive);
        return () => mediaQuery.removeListener(updateResponsive);
    }, []);

    const fieldErrorsPresent = useMemo(
        () => Boolean(errors && Object.values(errors).some((v) => v != null && String(v).trim() !== '')),
        [errors]
    );
    const messagePresent = Boolean(message?.text);
    const allowInnerScroll =
        showCaptcha ||
        messagePresent ||
        fieldErrorsPresent ||
        remainingAttempts !== undefined;
    const enableDesktopMeetzaBehavior =
        isMeetza &&
        activeTab !== 'verification' &&
        !isResponsiveView;
    const meetzaRestrictInnerScroll =
        enableDesktopMeetzaBehavior &&
        activeTab === 'signin' &&
        !allowInnerScroll;

    const logoStickyMeetza =
        enableDesktopMeetzaBehavior &&
        (activeTab === 'signup' || allowInnerScroll);

    /** Sign-up: لا نعيد scrollTop لو 0 لتفادي قفزة لمساحة فارغة فوق اللوجو؛ اللوجـين يضل يثبت من فوق وقت الإيرور */
    useLayoutEffect(() => {
        if (!logoStickyMeetza) return;
        if (activeTab === 'signup') return;
        const root = sectionRootRef.current;
        if (root) root.scrollTop = 0;
    }, [logoStickyMeetza, activeTab, messagePresent, fieldErrorsPresent, showCaptcha, remainingAttempts]);

    const scrollMinimalInColumn = (container, el, padding = 16) => {
        if (!container || !el) return;
        const pad = activeTab === 'signup' ? 10 : padding;
        if (isElementFullyVisibleIn(container, el, pad)) return;
        const cr = container.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        let delta = 0;
        if (er.bottom > cr.bottom - pad) {
            delta = er.bottom - cr.bottom + pad;
        } else if (er.top < cr.top + pad) {
            delta = er.top - cr.top - pad;
        }
        if (Math.abs(delta) < 2) return;
        if (activeTab === 'signup' && delta < 0) return;
        const behavior = activeTab === 'signup' ? 'auto' : 'smooth';
        const nextScrollTop = container.scrollTop + delta;
        if (delta > 0) {
            const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
            container.scrollTo({ top: Math.min(Math.max(0, nextScrollTop), maxTop), behavior });
            return;
        }
        container.scrollTo({ top: Math.max(0, nextScrollTop), behavior });
    };

    const scrollRelevantIntoView = () => {
        setTimeout(() => {
            const root = sectionRootRef.current;

            const scrollTarget = (el) => {
                if (!el) return;
                if (isMeetza && root) {
                    scrollMinimalInColumn(root, el, 16);
                } else {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            };

            if (showCaptcha) {
                const captcha = root?.querySelector('.g-recaptcha') ?? document.querySelector('.g-recaptcha');
                if (isMeetza && root && captcha) {
                    scrollMinimalInColumn(root, captcha, 24);
                } else if (captcha) {
                    captcha.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            if (messageBannerRef.current) {
                scrollTarget(messageBannerRef.current);
                return;
            }
            if (remainingAttemptsRef.current) {
                scrollTarget(remainingAttemptsRef.current);
                return;
            }
            if (fieldErrorsPresent && root) {
                const invalid = root.querySelector('.is-invalid');
                if (invalid) {
                    scrollTarget(invalid);
                    return;
                }
                const inlineErr = root.querySelector('.text-danger.small');
                if (inlineErr) scrollTarget(inlineErr);
            }
        }, 100);
    };

    useEffect(() => {
        if (!enableDesktopMeetzaBehavior) return;
        if (!allowInnerScroll) return;
        scrollRelevantIntoView();
    }, [allowInnerScroll, showCaptcha, messagePresent, fieldErrorsPresent, remainingAttempts, enableDesktopMeetzaBehavior]);

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
        };

        if (window.grecaptcha) {
            loadCaptcha();
        } else {
            window.onloadCallback = loadCaptcha;
        }
    }, [showCaptcha, systemName, authGoogleEnabled]);

    return (
        <motion.div
            ref={sectionRootRef}
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'signin' ? 300 : -300 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className={`w-100 d-flex flex-column ff ${logoStickyMeetza ? '' : 'justify-content-center'}`}
            style={{
                maxWidth: activeTab === 'verification' ? '500px' : '450px',
                minHeight: '100vh',
                overflowY: meetzaRestrictInnerScroll ? 'hidden' : 'auto',
                ...(logoStickyMeetza ? { justifyContent: 'flex-start' } : {})
            }}
        >
            <div className="text-center mb-0 mt-0">
                <div
                    style={
                        logoStickyMeetza
                            ? {
                                position: 'sticky',
                                top: 0,
                                zIndex: 6,
                                backgroundColor: 'var(--surface-color, #fff)',
                                paddingBottom: '8px',
                            }
                            : undefined
                    }
                >
                    <div className="logo-container" style={{ margin: '0 auto', width: '100%', textAlign: 'center' }}>
                        <div
                            className="d-flex flex-column align-items-center"
                            style={
                                isMeetza
                                    ? {
                                        position: 'relative',
                                        top: logoStickyMeetza
                                            ? 0
                                            : activeTab === 'signin'
                                                ? '-60px'
                                                : allowInnerScroll
                                                    ? '-22px'
                                                    : '-45px',
                                    }
                                    : {}
                            }
                        >
                            <BrandingLogo
                                showSystemName={!isMeetza}
                                className={isMeetza ? "meetza-standalone-logo" : ""}
                                style={{
                                    width: activeTab === 'verification' ? '150px' : (isMeetza ? '240px' : '200px'),
                                    height: 'auto',
                                    maxHeight: isMeetza ? '110px' : '86px',
                                    objectFit: 'contain',
                                    margin: '0 auto',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    padding: '0',
                                    background: 'transparent'
                                }}
                                systemNameStyle={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}
                            />
                            {(!isMeetza && showPoweredBy !== false) && (
                                <div className="d-flex align-items-center mt-2 text-muted justify-content-center" style={{ fontSize: '0.85rem', gap: '6px' }}>
                                    <span>Powered by</span>
                                    <img src="/assets/meetza.png" alt="Meetza" style={{ height: '18px', objectFit: 'contain' }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
                <div ref={messageBannerRef} className={`login-error-container ${message.type === "success" ? "success-container" : ""}`} role="alert">
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
                <div ref={remainingAttemptsRef} className="mb-3 text-center" style={{ maxWidth: "450px", margin: "0 auto" }}>
                    <small className="text-warning">
                        {remainingAttempts === 0 ? "No attempts remaining" : `${remainingAttempts} attempt(s) remaining`}
                    </small>
                </div>
            )}

            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown || undefined} autoComplete="on">
                {children ? (
                    children
                ) : (
                    activeTab !== 'verification' && (
                        <>
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
