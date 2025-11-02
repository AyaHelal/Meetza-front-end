import "./Footer.css";
import {
    FaInstagram,
    FaFacebookF,
    FaYoutube,
    FaTiktok,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

function Footer() {
    return (
        <footer className="footer-section text-white">
        <div className="container">
            <div className="footer-inner">
                <div className="footer-left">
                    <div className="lang-select">English</div>
                    <div className="social-icons d-flex gap-4">
                        <FaXTwitter />
                        <FaInstagram />
                        <FaFacebookF />
                        <FaYoutube />
                        <FaTiktok />
                    </div>
                </div>

                <div className="footer-right">
                    <div className="footer-links">
                        <div>
                            <h6 className="fw-bold mb-4">Product</h6>
                            <ul className="list-unstyled">
                                <li>Download</li>
                                <li>Nitro</li>
                                <li>Status</li>
                                <li>App Directory</li>
                                <li>New Mobile Experience</li>
                            </ul>
                        </div>

                        <div>
                            <h6 className="fw-bold mb-4">About</h6>
                            <ul className="list-unstyled">
                                <li>Jobs</li>
                                <li>Brand</li>
                                <li>Newsroom</li>
                            </ul>
                        </div>

                        <div>
                            <h6 className="fw-bold mb-4">Resources</h6>
                            <ul className="list-unstyled">
                                <li>College</li>
                                <li>Support</li>
                                <li>Safety</li>
                                <li>Blog</li>
                                <li>Feedback</li>
                                <li>StreamKit</li>
                                <li>Creators</li>
                            </ul>
                        </div>

                        <div>
                            <h6 className="fw-bold mb-4">Policies</h6>
                            <ul className="list-unstyled">
                                <li>Terms</li>
                                <li>Privacy</li>
                                <li>Cookie Settings</li>
                                <li>Guidelines</li>
                                <li>Licenses</li>
                                <li>Company Information</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="footer-line" />
            <div className="d-flex justify-content-between align-items-center">
                <img
                    src="/assets/meetza.png"
                    alt="Meetza Logo"
                    style={{
                        maxWidth: '250px',
                        height: '180px',
                        margin: '0',
                        padding: '0',
                        background: 'transparent'
                    }}
                />
            </div>
        </div>
        </footer>
    );
};

export default Footer;
