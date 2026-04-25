import React from "react";

export function WeeklyDeleteModal({ show, onClose, onConfirmThisWeek, onConfirmAllWeeks, confirming }) {
  if (!show) return null;

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content rounded-4 border-0" style={{ backgroundColor: "var(--card-bg)", boxShadow: "0 10px 40px var(--shadow-color)" }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold" style={{ fontSize: "24px", color: "var(--text-primary)" }}>
              Delete Weekly Meeting
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
              style={{ fontSize: "14px" }}
              disabled={confirming}
            />
          </div>
          <div className="modal-body pt-3">
            <p style={{ fontSize: "16px", color: "var(--text-primary)", marginBottom: "20px" }}>
              This is a weekly meeting. What would you like to delete?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="btn rounded-3"
                onClick={onConfirmThisWeek}
                disabled={confirming}
                style={{
                  backgroundColor: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid transparent",
                  padding: "12px 20px",
                  fontSize: "16px",
                  fontWeight: "600",
                  textAlign: "left",
                }}
              >
                📅 Delete for this week only
              </button>
              <button
                type="button"
                className="btn rounded-3"
                onClick={onConfirmAllWeeks}
                disabled={confirming}
                style={{
                  backgroundColor: "transparent",
                  color: "#dc2626",
                  border: "1px solid transparent",
                  padding: "12px 20px",
                  fontSize: "16px",
                  fontWeight: "600",
                  textAlign: "left",
                }}
              >
                🗑️ Delete all weekly meetings
              </button>
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
