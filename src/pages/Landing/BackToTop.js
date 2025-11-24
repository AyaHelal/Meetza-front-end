import { motion } from "framer-motion";
import { createPortal } from "react-dom";

const BackToTop = ({ show }) => {
    if (!show) return null;

    return createPortal(
        <motion.button
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        aria-label="Back to top"
        style={{ transform: "translateZ(0)" }}
        >
        ↑
        </motion.button>,
        document.body
    );
};

export default BackToTop;
