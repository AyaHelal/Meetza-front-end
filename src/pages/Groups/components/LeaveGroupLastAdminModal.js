import React, { useEffect, useMemo, useState } from "react";
import { buildFileUrl } from "../../VideoSessions/services/videoSessionsService";

function candidatePhotoUrl(photo) {
  if (!photo || typeof photo !== "string") return null;
  return buildFileUrl(photo.trim()) || null;
}

/** Hide Super Admins from picker (backend also filters; this is a safety net if `role` is present). */
function filterOutSuperAdminCandidates(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((c) => {
    const r = (c?.role ?? c?.Role ?? "").toString().trim();
    if (!r) return true;
    const lower = r.toLowerCase();
    if (r === "Super_Admin" || lower.includes("super_admin") || lower.includes("super-admin")) return false;
    return true;
  });
}

/**
 * 409 LAST_ADMIN_ASSIGN_REQUIRED — pick successor admin then POST /group/:id/leave again.
 */
export default function LeaveGroupLastAdminModal({
  show,
  groupName,
  candidates = [],
  currentAdminRole,
  onClose,
  onConfirm,
  submitting = false,
}) {
  const [selectedId, setSelectedId] = useState("");
  const [roleChoice, setRoleChoice] = useState("");

  const visibleCandidates = useMemo(() => filterOutSuperAdminCandidates(candidates), [candidates]);

  useEffect(() => {
    if (!show) {
      setSelectedId("");
      setRoleChoice("");
      return;
    }
    setSelectedId("");
    setRoleChoice("");
  }, [show, candidates]);

  useEffect(() => {
    if (!show || !selectedId) return;
    const stillThere = visibleCandidates.some((c) => String(c.id ?? c.user_id ?? "") === selectedId);
    if (!stillThere) setSelectedId("");
  }, [show, selectedId, visibleCandidates]);

  if (!show) return null;

  const handleConfirm = async () => {
    if (!selectedId) return;
    const body = { new_admin_id: selectedId };
    if (roleChoice === "OWNER" || roleChoice === "ADMIN") {
      body.new_admin_role = roleChoice;
    }
    await onConfirm(body);
  };

  return (
    <div
      className="modal show d-block leave-group-last-admin-modal-backdrop"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-last-admin-title"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg leave-group-last-admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content rounded-4 border-0 shadow leave-group-last-admin-modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold" id="leave-last-admin-title" style={{ fontSize: "1.15rem" }}>
              Assign admin before leaving
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={submitting} />
          </div>
          <div className="modal-body pt-2">
            <p className="text-secondary mb-3">
              You are the last admin{groupName ? ` in “${groupName}”` : ""}. Choose another administrator to take
              over before you leave.
            </p>
            {currentAdminRole ? (
              <p className="small text-muted mb-3">
                Your role: <strong>{currentAdminRole}</strong>
              </p>
            ) : null}

            {visibleCandidates.length === 0 ? (
              <p className="text-danger small mb-0">No eligible administrators were returned. Contact support.</p>
            ) : (
              <>
                <label className="form-label fw-semibold small mb-2">New admin</label>
                <div className="leave-group-candidates list-group mb-3" style={{ maxHeight: 240, overflowY: "auto" }}>
                  {visibleCandidates.map((c) => {
                    const id = String(c.id ?? c.user_id ?? "");
                    const name = String(c.name ?? c.username ?? "User").trim() || "User";
                    const photoUrl = candidatePhotoUrl(c.user_photo);
                    const active = selectedId === id;
                    return (
                      <button
                        key={id || name}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-2 ${
                          active ? "active" : ""
                        }`}
                        onClick={() => setSelectedId(id)}
                        disabled={submitting || !id}
                      >
                        <span className="leave-group-candidate-avatar flex-shrink-0">
                          {photoUrl ? (
                            <img src={photoUrl} alt="" className="rounded-circle leave-group-candidate-photo" width={40} height={40} />
                          ) : (
                            <span className="leave-group-candidate-initial rounded-circle">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="text-start fw-medium">{name}</span>
                      </button>
                    );
                  })}
                </div>

                <label className="form-label fw-semibold small mb-1" htmlFor="leave-new-admin-role">
                  Role for new admin (optional)
                </label>
                <select
                  id="leave-new-admin-role"
                  className="form-select form-select-sm mb-3"
                  value={roleChoice}
                  onChange={(e) => setRoleChoice(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Default (server decides)</option>
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </>
            )}
          </div>
          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-light rounded-3 fw-semibold" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary rounded-3 fw-semibold"
              onClick={handleConfirm}
              disabled={submitting || !selectedId || visibleCandidates.length === 0}
            >
              {submitting ? "Leaving…" : "Assign & leave"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
