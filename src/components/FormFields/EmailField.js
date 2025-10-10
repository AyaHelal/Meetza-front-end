import { Form } from 'react-bootstrap';

const EmailField = ({ value, onChange, placeholder = "Enter your email", name = "email" }) => {
    return (
        <Form.Group className="mb-3">
            <div className="position-relative">
                <Form.Control
                    type="email"
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="py-3 pe-4 border-4"
                    style={{
                        borderRadius: '12px',
                        backgroundColor: '#f8f9fa',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        paddingLeft: '50px'
                    }}
                />
                <div className="position-absolute top-50 start-0 translate-middle-y ms-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-envelope text-muted" viewBox="0 0 16 16">
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
                    </svg>
                </div>
            </div>
        </Form.Group>
    );
};

export default EmailField;
