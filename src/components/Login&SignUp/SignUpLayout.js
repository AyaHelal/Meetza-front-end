import { motion } from 'framer-motion';
import { Row, Col } from 'react-bootstrap';
import ImageSection from './ImageSection';

const SignUpLayout = ({
    currentImageIndex,
    images,
    children
}) => {
    return (
        <motion.div
            key="signup-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
        >
            <Row className="g-0">
                {/* Left Side - Image */}
                <Col lg={6} className="d-none d-lg-flex align-items-center justify-content-center p-0">
                    <ImageSection
                        currentImageIndex={currentImageIndex}
                        images={images}
                        initialX={300}
                        animateX={0}
                    />
                </Col>

                {/* Right Side - Content */}
                <Col lg={6} className="d-flex align-items-center justify-content-center bg-white p-0 m-0">
                    {children}
                </Col>
            </Row>
        </motion.div>
    );
};

export { SignUpLayout };