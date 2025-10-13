
const PasswordStrengthIndicator = ({ password }) => {
    const getPasswordStrength = (password) => {
        if (!password) return { strength: 0, label: '', color: '' };

        let score = 0;
        let checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
        };

        Object.values(checks).forEach(check => {
            if (check) score++;
        });

        if (score <= 2) {
            return { strength: 1, label: 'Weak', color: '#dc3545' }; // أحمر
        } else if (score === 3) {
            return { strength: 2, label: 'Medium', color: '#fd7e14' }; // برتقاني
        } else {
            return { strength: 3, label: 'Strong', color: '#198754' }; // أخضر
        }
    };

    const { strength, label, color } = getPasswordStrength(password);

    return (
        <div className="mt-2">
            <div className="d-flex align-items-center gap-2 ml-1">
                <div className="flex-grow-1">
                    <div
                        className="progress"
                        style={{ height: '6px', borderRadius: '3px' }}
                    >
                        <div
                            className="progress-bar"
                            style={{
                                width: `${(strength / 3) * 100}%`,
                                backgroundColor: color,
                                borderRadius: '3px',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>
                </div>
                <span
                    className="small fw-medium"
                    style={{
                        color: color,
                        fontSize: '0.75rem',
                        minWidth: '50px'
                    }}
                >
                    {label}
                </span>
            </div>
            {password && (
                <div className="mt-1">
                    <small className="text-muted">
                        {strength === 1 && "💡 Try adding uppercase, numbers, or symbols"}
                        {strength === 2 && "👍 Good! Add more variety for stronger password"}
                        {strength === 3 && "🔥 Excellent! Your password is very strong"}
                    </small>
                </div>
            )}
        </div>
    );
};

export default PasswordStrengthIndicator;
