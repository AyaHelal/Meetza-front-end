import "./Footer.css";
import {
    FaInstagram,
    FaFacebookF,
    FaYoutube,
    FaLinkedinIn,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Footer() {
    const navigate = useNavigate();

    const go = (to) => (e) => {
        e.preventDefault();
        navigate(to);
    };

    return (
        <footer className="footer-section text-white">
            <div className="container">
                <div className="footer-inner">
                    <div className="footer-left">
                        <div className="social-icons d-flex gap-4">
                            <a
                                href="https://www.instagram.com/meetza2025/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white"
                                aria-label="Meetza on Instagram"
                            >
                                <FaInstagram />
                            </a>
                            <a href="https://www.facebook.com/profile.php?id=61582237062845" target="_blank" rel="noopener noreferrer" className="text-white">
                                <FaFacebookF />
                            </a>
                            <a
                                href="https://www.youtube.com/@Meetza-h8n"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white"
                                aria-label="Meetza on YouTube"
                            >
                                <FaYoutube />
                            </a>
                            <a href="https://www.linkedin.com/company/109356033/admin/dashboard/" target="_blank" rel="noopener noreferrer" className="text-white">
                                <FaLinkedinIn />
                            </a>
                        </div>
                    </div>

                    <div className="footer-right">
                        <div className="footer-links">
                            <div>
                                <h6 className="fw-bold mb-4">About</h6>
                                <ul className="list-unstyled">
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/landing#landing-careers")}>
                                            Jobs / Careers
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h6 className="fw-bold mb-4">Resources</h6>
                                <ul className="list-unstyled">
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/landing#landing-support")}>
                                            Support
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/blog")}>
                                            Blog
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/landing#contact-section")}>
                                            Feedback
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h6 className="fw-bold mb-4">Policies</h6>
                                <ul className="list-unstyled">
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/terms")}>
                                            Terms
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/privacy")}>
                                            Privacy
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/guidelines")}>
                                            Guidelines
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" className="footer-link-btn" onClick={go("/licenses")}>
                                            Licenses
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="footer-line" />
                <div className="fl d-flex justify-content-between align-items-center">
                    <div className="footer-logo-container">
                        <img
                            src="/assets/meetza.png"
                            alt="Meetza Logo"
                            className="footer-logo"
                        />
                    </div>
                    <div className="footer-copyright">
                        <p>© 2025Meetza — All rights reserved</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
