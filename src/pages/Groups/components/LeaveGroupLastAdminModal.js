import React, { useEffect, useMemo, useState } from "react";

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
 * LAST_ADMIN_ASSIGN_REQUIRED (e.g. 409) — pick successor admin then POST /group/:id/leave again.
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

  const visibleCandidates = useMemo(() => filterOutSuperAdminCandidates(candidates), [candidates]);

  useEffect(() => {
    if (!show) {
      setSelectedId("");
      return;
    }
    setSelectedId("");
  }, [show, candidates]);

  useEffect(() => {
    if (!show || !selectedId) return;
    const stillThere = visibleCandidates.some((c) => String(c.id ?? c.user_id ?? "") === selectedId);
    if (!stillThere) setSelectedId("");
  }, [show, selectedId, visibleCandidates]);

  if (!show) return null;

  const handleConfirm = async () => {
    if (!selectedId) return;
    const body = { new_admin_id: selectedId, new_admin_role: "OWNER" };
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
              Assign leader before leaving
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={submitting} />
          </div>
          <div className="modal-body pt-2">
            <p className="text-secondary mb-3">
              You are the last leader{groupName ? ` in “${groupName}”` : ""}. Choose another leader to take
              over before you leave.
            </p>

            {visibleCandidates.length === 0 ? (
              <p className="text-danger small mb-0">No eligible leader were returned. Contact support.</p>
            ) : (
              <>
                <label className="form-label fw-semibold small mb-2" htmlFor="leave-new-admin-user">
                  New leader
                </label>
                <select
                  id="leave-new-admin-user"
                  className="form-select mb-3"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select an leader…</option>
                  {visibleCandidates.map((c) => {
                    const id = String(c.id ?? c.user_id ?? "");
                    const name = String(c.name ?? c.username ?? "User").trim() || "User";
                    if (!id) return null;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>

                <p className="small text-muted mb-3">
                  The selected leader will be sent as <strong>OWNER</strong> by default.
                </p>
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
