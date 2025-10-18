import { motion } from 'framer-motion';

const ImageSection = ({
    currentImageIndex,
    images,
    initialX = -300,
    animateX = 0
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: initialX }}
            animate={{ opacity: 1, x: animateX }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="position-relative d-flex align-items-center justify-content-center"
            style={{
                width: '100%',
                height: '100%',
                minHeight: '100vh',
                transform: 'translateY(-15px)',
                padding: '0 10px'
            }}
        >
            <motion.img
                src={images[currentImageIndex]}
                alt="Illustration"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="img-fluid carousel-image"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))'
                }}
            />
        </motion.div>
    );
};

export default ImageSection;
