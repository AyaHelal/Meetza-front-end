import React from "react";
import { X } from "@phosphor-icons/react";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: "20px",
};

const panelStyle = {
  background: "#fff",
  borderRadius: "16px",
  maxWidth: "420px",
  width: "100%",
  padding: "1.25rem",
  boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
};

/**
 * Assign group admin — same contract as meetza-admin: POST /group/:id/admins { email, role? }.
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
          <h4 id="assign-admin-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            Assign admin
          </h4>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
            <X size={22} />
          </button>
        </div>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#6b7280" }}>
          User must already have the <strong>Administrator</strong> role in the system.
        </p>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem" }}>Group</label>
        <input type="text" value={groupLabel} disabled style={{ width: "100%", padding: "10px 12px", marginBottom: "1rem", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem" }}>
          Email <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email || ""}
          onChange={handleChange}
          placeholder="user@example.com"
          style={{ width: "100%", padding: "10px 12px", marginBottom: "1rem", borderRadius: 8, border: "1px solid #e5e7eb" }}
          autoComplete="email"
        />
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem" }}>Role (optional)</label>
        <select
          name="role"
          value={formData.role || ""}
          onChange={handleChange}
          style={{ width: "100%", padding: "10px 12px", marginBottom: "1.25rem", borderRadius: 8, border: "1px solid #e5e7eb" }}
        >
          <option value="">ADMIN (default)</option>
          <option value="ADMIN">ADMIN</option>
          <option value="OWNER">OWNER</option>
        </select>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !(formData.email || "").trim()}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: saving ? "#93c5fd" : "#0076EA",
            color: "#fff",
            fontWeight: 600,
            cursor: saving || !(formData.email || "").trim() ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Assigning…" : "Assign"}
        </button>
      </div>
    </div>
  );
}

/**
 * Remove group admin — same as meetza-admin: DELETE /group/:id/admins/:email
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
          <h4 id="remove-admin-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            Remove assigned admin
          </h4>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
            <X size={22} />
          </button>
        </div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem" }}>Group</label>
        <input type="text" value={groupLabel} disabled style={{ width: "100%", padding: "10px 12px", marginBottom: "1rem", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: "0.9rem" }}>
          Admin email <span style={{ color: "#dc2626" }}>*</span>
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
            border: "1px solid #e5e7eb",
            background: emailReadOnly ? "#f9fafb" : "#fff",
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
