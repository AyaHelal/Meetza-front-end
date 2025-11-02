import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./HeroSection.css";

export default function HeroNav() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <div className="container hero-nav-container p-5">
            <nav className="navbar navbar-expand-lg navbar-dark px-4">
                {/* Logo */}
                <a className="navbar-brand d-flex align-items-center" href="/" onClick={closeMenu}>
                    <img
                        src="/assets/meetza_copy.png"
                        alt="Meetza"
                        className="navbar-logo"
                    />
                </a>

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
                    <div className="vr mx-3 d-none d-lg-block"></div>

                    {/* Navigation Links */}
                    <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <button type="button" className="nav-link btn btn-link p-0 active" onClick={closeMenu}>Discover</button>
                        </li>
                        <li className="nav-item">
                            <button type="button" className="nav-link btn btn-link p-0" onClick={closeMenu}>Safety</button>
                        </li>
                        <li className="nav-item">
                            <button type="button" className="nav-link btn btn-link p-0" onClick={closeMenu}>Support</button>
                        </li>
                        <li className="nav-item">
                            <button type="button" className="nav-link btn btn-link p-0" onClick={closeMenu}>Blog</button>
                        </li>
                        <li className="nav-item">
                            <button type="button" className="nav-link btn btn-link p-0" onClick={closeMenu}>Careers</button>
                        </li>
                    </ul>
                    {/* Login button removed as requested */}
                </div>
            </nav>
        </div>
    );
}
