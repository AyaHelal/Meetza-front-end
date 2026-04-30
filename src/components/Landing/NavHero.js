import { useMemo, useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./HeroSection.css";
import { useBranding } from "../../context/BrandingContext";
import BrandingLogo from "../common/BrandingLogo";

export default function HeroNav() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { systemName, logoUrl } = useBranding();
    
    const isMeetza = systemName?.trim().toLowerCase() === 'meetza';

    const discoverItems = useMemo(
        () => [
            { label: "Meetings", hash: "#landing-secure-video-meetings" },
            { label: "Real Time Chat", hash: "#landing-real-time-chat" },
            { label: "Video Sessions", hash: "#landing-video-sessions" },
            { label: "Schedule Meetings", hash: "#landing-meeting-schedule" },
        ],
        []
    );

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        setIsDiscoverOpen(false);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
        setIsDiscoverOpen(false);
    };

    const handleLandingSection = (hash) => {
        closeMenu();

        const isOnLanding = location.pathname === "/" || location.pathname === "/landing";
        if (!isOnLanding) {
            navigate(`/landing${hash}`);
            return;
        }

        const id = hash.replace("#", "");
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else navigate(`/landing${hash}`);
    };

    return (
        <div className="container hero-nav-container p-5">
            <nav className="navbar navbar-expand-lg navbar-dark px-4">
                {/* Logo */}
                <button
                    type="button"
                    className="navbar-brand d-flex align-items-center btn btn-link p-0"
                    onClick={() => {
                        closeMenu();
                        navigate("/");
                    }}
                >
                    <BrandingLogo 
                        showSystemName={!isMeetza}
                        className="d-flex flex-row align-items-center gap-2"
                        style={{ objectFit: 'contain', maxHeight: isMeetza ? '25px' : '40px' }}
                        systemNameStyle={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}
                    />
                </button>

                <button
                    className="navbar-toggler"
                    type="button"
                    onClick={toggleMenu}
                    aria-controls="heroNav"
                    aria-expanded={isMenuOpen}
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Menu Items */}
                <div className={`collapse navbar-collapse justify-content-between ${isMenuOpen ? 'show' : ''}`} id="heroNav">
                    

                    {/* Navigation Links */}
                    <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
                        <li className={`nav-item dropdown hero-discover ${isDiscoverOpen ? "show" : ""}`}>
                            <button
                                type="button"
                                className="nav-link btn btn-link p-0 active dropdown-toggle"
                                aria-expanded={isDiscoverOpen}
                                onClick={() => setIsDiscoverOpen((v) => !v)}
                            >
                                Discover
                            </button>

                            <div className={`dropdown-menu hero-discover-menu ${isDiscoverOpen ? "show" : ""}`}>
                                {discoverItems.map((item) => (
                                    <button
                                        key={item.hash}
                                        type="button"
                                        className="dropdown-item"
                                        onClick={() => handleLandingSection(item.hash)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </li>
                        <li className="nav-item">
                            <button
                                type="button"
                                className="nav-link btn btn-link p-0"
                                onClick={() => handleLandingSection("#landing-support")}
                            >
                                Support
                            </button>
                        </li>
                        <li className="nav-item">
                            <a
                                className="nav-link btn btn-link p-0"
                                href="/blog"
                                onClick={(e) => {
                                    e.preventDefault();
                                    closeMenu();
                                    // Navigate via router; href is a fallback
                                    navigate("/blog");
                                }}
                            >
                                Blog
                            </a>
                        </li>
                        <li className="nav-item">
                            <button
                                type="button"
                                className="nav-link btn btn-link p-0"
                                onClick={(e) => {
                                    e.preventDefault();
                                    closeMenu();
                                    // Scroll to Careers section on Landing
                                    const el = document.getElementById('landing-careers');
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                            >
                                Careers
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                type="button"
                                className="nav-link btn btn-link p-0"
                                onClick={(e) => {
                                    e.preventDefault();
                                    closeMenu();
                                    const contactSection = document.getElementById('contact-section');
                                    if (contactSection) {
                                        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                            >
                                Contact Us
                            </button>
                        </li>
                    </ul>
                    {/* Login button removed as requested */}
                </div>
            </nav>
        </div>
    );
}
