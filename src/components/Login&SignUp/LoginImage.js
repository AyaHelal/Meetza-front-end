import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../../pages/Login/Login.css";

const LoginImage = ({ isSignup = false }) => {
    const [imageSrc, setImageSrc] = useState("");
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1500);

    useEffect(() => {
        const handleResize = () => {
            setIsLargeScreen(window.innerWidth >= 1500);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        setImageSrc(
            isSignup 
                ? (isLargeScreen ? "/assets/image 2 large.png" : "/assets/image 2.png")
                : (isLargeScreen ? "/assets/image 1 large.png" : "/assets/image 1.png")
        );
    }, [isSignup, isLargeScreen]);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: '12px'
        }}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={isSignup ? 'signup' : 'login'}
                    initial={{ opacity: 0, x: isSignup ? 100 : -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isSignup ? -100 : 100 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <img
                        src={imageSrc}
                        alt={isSignup ? "Signup Illustration" : "Login Illustration"}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            pointerEvents: 'none'
                        }}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default LoginImage;