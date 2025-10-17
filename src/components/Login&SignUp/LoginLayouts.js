import { motion } from 'framer-motion';
import { Row, Col } from 'react-bootstrap';
import FormSection from './FormSection';
import ImageSection from './ImageSection';

const LoginLayout = ({
    activeTab,
    setActiveTab,
    formData,
    handleInputChange,
    handleSubmit,
    isLoading,
    currentImageIndex,
    images,
    message,
    children
}) => {
    return (
        <motion.div
            key={`${activeTab}-layout`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
        >
            <Row className="g-0">
                {/* Left Side - Form */}
                <Col lg={6} className="d-flex align-items-center justify-content-center bg-white p-0 m-0">
                    <FormSection
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        message={message}
                    >
                        {children}
                    </FormSection>
                </Col>

                {/* Right Side - Illustration */}
                <Col lg={6} className="d-none d-lg-flex align-items-center justify-content-center p-0">
                    <ImageSection
                        currentImageIndex={currentImageIndex}
                        images={images}
                        initialX={-300}
                        animateX={0}
                    />
                </Col>
            </Row>
        </motion.div>
    );
};



export { LoginLayout };
