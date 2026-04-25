import React from "react";

const DEFAULT_CONFIRM_STYLE = {
    backgroundColor: "#FF0000",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 24px",
    fontSize: "16px",
    fontWeight: "600",
    marginLeft: "12px",
};

/** Primary style for OK/Save (not delete) */
const PRIMARY_CONFIRM_STYLE = {
    backgroundColor: "#0d6efd",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 24px",
    fontSize: "16px",
    fontWeight: "600",
    marginLeft: "12px",
};

/**
 * Confirmation modal for delete actions (same style as meetza-admin).
 * @param {boolean} show
 * @param {function} onClose
 * @param {function} onConfirm
 * @param {string} title
 * @param {string} message
 * @param {boolean} [confirming] - optional, disables confirm button while request in progress
 * @param {string} [confirmLabel] - optional, e.g. "OK" or "Delete"
 * @param {boolean} [confirmPrimary] - optional, if true use primary (blue) style instead of red
 */
export const ConfirmDeleteModal = ({
    show,
    onClose,
    onConfirm,
    title = "Delete",
    message = "Are you sure? This action cannot be undone.",
    confirming = false,
    confirmLabel = "Delete",
    confirmPrimary = false,
}) => {
    const confirmButtonStyle = confirmPrimary ? PRIMARY_CONFIRM_STYLE : DEFAULT_CONFIRM_STYLE;
    if (!show) return null;

    return (
        <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
        >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content rounded-4 border-0" style={{ 
                    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                    backgroundColor: "var(--card-bg)",
                    color: "var(--text-primary)"
                }}>
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title fw-bold" style={{ fontSize: "24px", color: "var(--text-primary)" }}>
                            {title}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" style={{ fontSize: "14px", filter: "var(--close-btn-filter)" }} disabled={confirming} />
                    </div>
                    <div className="modal-body pt-3">
                        <p style={{ fontSize: "16px", color: "var(--text-secondary)" }}>{message}</p>
                    </div>
                    <div className="modal-footer border-0 pt-0">
                        <button
                            type="button"
                            className="btn rounded-3"
                            onClick={onClose}
                            disabled={confirming}
                            style={{
                                backgroundColor: "var(--bg-light)",
                                color: "var(--text-primary)",
                                border: "none",
                                padding: "10px 24px",
                                fontSize: "16px",
                                fontWeight: "600",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn rounded-3"
                            onClick={onConfirm}
                            disabled={confirming}
                            style={confirmButtonStyle}
                        >
                            {confirming ? "..." : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
