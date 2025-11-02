import HeroNav from "./NavHero";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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
    return (
        <div className="hero-section" style={{
            background: 'url(/assets/landing_bg.png) no-repeat center center',
            backgroundSize: 'cover'
        }}>
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
                <motion.div className="hero-buttons d-flex justify-content-center" style={{ gap: '24px' }} variants={item}>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="btn btn-lg btn-success mt-3 px-5 rounded-3 py-2"
                        style={{ backgroundColor: "#00DC85", border: "none", fontSize: '18px' }}
                        onClick={() => navigate('/signup')}
                    >Member</motion.button>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="btn btn-lg btn-outline-light mt-3 px-5 rounded-3 py-2"
                        style={{ backgroundColor: "#0076EA", border: "none", fontSize: '18px' }}
                        onClick={() => { window.location.href = 'https://meetza-front-end-admin.vercel.app/signup'; }}
                    >Administrative</motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
}
