import { AnimatePresence, motion } from 'framer-motion';
import { Container } from 'react-bootstrap';

const LayoutWrapper = ({ children }) => {
    return (
        <div className="login-page-wrapper">
            <Container fluid className="p-0">
                <AnimatePresence mode="sync">
                    <motion.div
                        key={children?.key || "login-layout"}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </Container>
        </div>
    );
};

export default LayoutWrapper;
