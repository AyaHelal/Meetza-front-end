import { motion } from 'framer-motion';

const LogoSection = () => {
    return (
        <motion.div
            className="text-center mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="logo-container">
                <img
                    src="/assets/meetza.png"
                    alt="Meetza"
                    style={{
                        maxWidth: '250px',
                        height: '200px',
                        margin: '0',
                        padding: '0',
                        background: 'transparent'
                    }}
                />
            </div>
        </motion.div>
    );
};

export default LogoSection;
