import HeroNav from "./NavHero";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import dashboardAnimation from "../../lottie/dashboard.json";

const container = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.12 }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function HeroSection() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // Ensure loading state is reset if we return to this page (e.g. via Back button or BFcache)
    useEffect(() => {
        setIsLoading(false);
        
        const handlePageShow = (event) => {
            if (event.persisted) {
                setIsLoading(false);
            }
        };

        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    const handleDashboardClick = () => {
        setIsLoading(true);
        
        let adminUrl;
        if (window.location.hostname === 'localhost') {
            const currentPort = window.location.port;
            const targetPort = currentPort ? parseInt(currentPort) + 1 : 3001;
            adminUrl = `http://localhost:${targetPort}/login`;
        } else {
            adminUrl = 'https://meetza-front-end-admin.vercel.app/login';
        }
        
        // Give time for animation to play before redirecting
        setTimeout(() => {
            window.location.href = adminUrl;
        }, 2000);
    };

    return (
        <div
            className="hero-section"
            style={{
                backgroundImage: "url(/assets/landing_bg.png)",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                backgroundPosition: "top center",
                backgroundAttachment: "fixed",
            }}
        >
            <AnimatePresence>
                {isLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            background: "linear-gradient(to bottom, #00bfa5, #0066ff)",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div style={{ width: '400px', height: '400px' }}>
                            <Lottie animationData={dashboardAnimation} loop={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <HeroNav />
            <motion.div
                className="container text-center text-white"
                style={{ paddingTop: '180px', paddingBottom: '350px' }}
                variants={container}
                initial="hidden"
                animate="visible"
            >
                <motion.h1 className="fw-semibold" style={{ fontSize: "48px" }} variants={item}>
                    One Space For Everyone, One Place To
                    <br />
                    Manage It All.
                </motion.h1>
                <motion.p className="lead mt-4 mb-5" variants={item}>Your gate to new experience and the one to organize</motion.p>
                <motion.div className="hero-buttons d-flex justify-content-center" style={{ gap: '10px' }} variants={item}>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className=" hero-login-btn her0-button-primary btn  btn-lg btn-outline-light mt-3 px-5 rounded-3 py-2"
                        style={{ backgroundColor: "#00DC85", border: "none", fontSize: '18px' }}
                        onClick={() => navigate('/signup')}
                    >Meetza</motion.button>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className=" hero-button-secondary hero-login-btn btn btn-lg btn-outline-light mt-3 px-5 rounded-3 py-2"
                        style={{ backgroundColor: "#0076EA", border: "none", fontSize: '18px' }}
                        onClick={handleDashboardClick}
                    >Dashboard</motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
}
