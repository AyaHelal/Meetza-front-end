import { motion } from "framer-motion";
import Lottie from "lottie-react";
import "./PageLoader.css";
import animationData from "../../lottie/loading.json";

const PageLoader = () => {
  return (
    <motion.div
      className="d-flex flex-column align-items-center justify-content-center vh-100 loader-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <Lottie
        animationData={animationData}
        loop
        autoplay
        style={{ width: 380, height: 380 }}
      />

      <div className="d-flex mt-4 gap-2">
        <motion.span
          className="dot"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
        />
        <motion.span
          className="dot"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
        />
        <motion.span
          className="dot"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
        />
      </div>
    </motion.div>
  );
};

export default PageLoader;
