import React from "react";
import { X } from "@phosphor-icons/react";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: "20px",
};

const panelStyle = {
  background: "var(--card-bg)",
  color: "var(--text-primary)",
  borderRadius: "16px",
  maxWidth: "420px",
  width: "100%",
  padding: "1.25rem",
  boxShadow: "var(--shadow-lg)",
};

/**
 * Assign group admin — POST /group/:id/admins with { email, role? } or { emails, role? }.
 */
export function AssignGroupAdminMeetzaModal({
  groupLabel,
  formData,
  setFormData,
  onSubmit,
  onClose,
  saving = false,
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="group-admin-modal-overlay" style={overlayStyle} onClick={onClose} role="presentation">
      <div style={panelStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="assign-admin-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h4 id="assign-admin-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Assign leader
          </h4>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "var(--text-secondary)" }}>
            <X size={22} />
          </button>
        </div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem", color: "var(--text-primary)" }}>Group</label>
        <input type="text" value={groupLabel} disabled style={{ width: "100%", padding: "10px 12px", marginBottom: "1rem", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-light)", color: "var(--text-muted)" }} />
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem", color: "var(--text-primary)" }}>
          Leader email(s) <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <textarea
          name="emailsText"
          value={formData.emailsText || ""}
          onChange={handleChange}
          placeholder="One per line or separated by commas"
          rows={4}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: "0.35rem",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            background: "var(--bg-light)",
            color: "var(--text-primary)",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          You can assign several leaders at once.
        </p>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Assigned users will be sent as <strong>Leader</strong> by default.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !(formData.emailsText || "").trim()}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: saving ? "var(--bg-light)" : "var(--primary-color)",
            color: "#fff",
            fontWeight: 600,
            cursor: saving || !(formData.emailsText || "").trim() ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Assigning…" : "Assign"}
        </button>
      </div>
    </div>
  );
}

/**
 * Remove group admin — DELETE /group/:id/admins with `{ email }` in the body.
 */
export function RemoveGroupAdminMeetzaModal({
  groupLabel,
  email,
  setEmail,
  emailReadOnly = false,
  onConfirm,
  onClose,
  saving = false,
}) {
  return (
    <div className="group-admin-modal-overlay" style={overlayStyle} onClick={onClose} role="presentation">
      <div style={panelStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="remove-admin-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h4 id="remove-admin-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Remove assigned leader
          </h4>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "var(--text-secondary)" }}>
            <X size={22} />
          </button>
        </div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem", color: "var(--text-primary)" }}>Group</label>
        <input type="text" value={groupLabel} disabled style={{ width: "100%", padding: "10px 12px", marginBottom: "1rem", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-light)", color: "var(--text-muted)" }} />
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem", color: "var(--text-primary)" }}>
          Leader email <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          type="email"
          value={email || ""}
          onChange={(e) => !emailReadOnly && setEmail(e.target.value)}
          readOnly={emailReadOnly}
          placeholder="email to remove"
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: "1.25rem",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            background: "var(--bg-light)",
            color: emailReadOnly ? "var(--text-muted)" : "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || !(email || "").trim()}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: saving ? "#fca5a5" : "#dc2626",
            color: "#fff",
            fontWeight: 600,
            cursor: saving || !(email || "").trim() ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Removing…" : "Remove"}
        </button>
      </div>
    </div>
  );
}
