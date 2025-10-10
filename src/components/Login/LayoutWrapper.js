import { AnimatePresence } from 'framer-motion';
import { Container} from 'react-bootstrap';

const LayoutWrapper = ({
    children
}) => {
    return (
        <div className="login-page-wrapper">
            <Container fluid className="p-0">
                <AnimatePresence mode="wait">
                    {children}
                </AnimatePresence>
            </Container>
        </div>
    );
};

export default LayoutWrapper;
