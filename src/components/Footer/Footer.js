import "./Footer.css";
import React from "react";
import {
    FaInstagram,
    FaFacebookF,
    FaYoutube,
    FaLinkedinIn,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useBranding } from "../../context/BrandingContext";
import BrandingLogo from "../common/BrandingLogo";

function Footer() {
    const navigate = useNavigate();
    const { systemName, logoUrl, showPoweredBy } = useBranding();
    
    const isMeetza = systemName?.trim().toLowerCase() === 'meetza';

    const go = (to) => (e) => {
        e.preventDefault();
        navigate(to);
    };

    const footerSections = [
      {
        title: "About",
        items: [{ label: "Jobs / Careers", to: "/landing#landing-careers" }],
      },
      {
        title: "Resources",
        items: [
          { label: "Support", to: "/landing#landing-support" },
          { label: "Blog", to: "/blog" },
          { label: "Feedback", to: "/landing#contact-section" },
        ],
      },
      {
        title: "Policies",
        items: [
          { label: "Terms", to: "/terms" },
          { label: "Privacy", to: "/privacy" },
          { label: "Guidelines", to: "/guidelines" },
        ],
      },
    ];

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
                            {footerSections.map((sec) => (
                              <div key={sec.title}>
                                <h6 className="fw-bold mb-4">{sec.title}</h6>
                                <ul className="list-unstyled">
                                  {sec.items.map((it) => (
                                    <li key={it.to}>
                                      <button type="button" className="footer-link-btn" onClick={go(it.to)}>
                                        {it.label}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                        </div>
                    </div>
                </div>

                <hr className="footer-line" />
                <div className="fl d-flex justify-content-between align-items-center">
                    <div className="footer-logo-container">
                        <BrandingLogo 
                            showSystemName={!isMeetza}
                            className="footer-logo d-flex flex-row align-items-center gap-2"
                            style={{ objectFit: 'contain', maxHeight: '35px', maxWidth: '100px' }}
                            systemNameStyle={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}
                        />
                    </div>
                    <div className="footer-copyright d-flex flex-column align-items-end">
                        <p>© 2025Meetza — All rights reserved</p>
                        {(!isMeetza && showPoweredBy) && (
                            <div className="d-flex align-items-center mt-1" style={{ opacity: 0.7 }}>
                                <small style={{ fontSize: '12px', marginRight: '5px' }}>
                                    Powered by
                                </small>
                                <img src="/assets/meetza.png" alt="Meetza" style={{ height: '14px', filter: 'brightness(1.5)' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
