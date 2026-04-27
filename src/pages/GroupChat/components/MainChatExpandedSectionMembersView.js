import React from "react";
import {
  Plus,
  Trash,
  X,
  UserPlus,
  UserMinus,
} from "@phosphor-icons/react";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";
import {
  AssignGroupAdminMeetzaModal,
  RemoveGroupAdminMeetzaModal,
} from "./GroupAdminMeetzaModals";
import { getInitials } from "../utils/mainChatMessageUtils";
import { getEffectiveMemberRole } from "./MainChatExpandedSectionRoleUtils";

export default function MainChatExpandedSectionMembersView({
  members,
  groupInfo,
  isOwner,
  isAdmin,
  currentUserEmail,
  groupLabelForModals,
  showDeleteModal,
  setShowDeleteModal,
  handleDeleteMember,
  memberToDelete,
  isDeletingMember,
  showAssignAdminModal,
  assignAdminForm,
  setAssignAdminForm,
  handleAssignGroupAdmin,
  setShowAssignAdminModal,
  assigningAdmin,
  showRemoveAdminModal,
  removeAdminEmail,
  setRemoveAdminEmail,
  removeAdminEmailReadOnly,
  handleRemoveGroupAdmin,
  setShowRemoveAdminModal,
  setRemoveAdminEmailReadOnly,
  removingAdmin,
  showAddMemberModal,
  setShowAddMemberModal,
  newMemberEmail,
  setNewMemberEmail,
  handleAddMember,
  isAdding,
  setMemberToDelete,
  openRemoveAdminModal,
}) {
  const sortedMembers = [...members].sort((a, b) => {
    const aRole = getEffectiveMemberRole(a, groupInfo);
    const bRole = getEffectiveMemberRole(b, groupInfo);
    if (aRole === "owner" && bRole !== "owner") return -1;
    if (aRole !== "owner" && bRole === "owner") return 1;
    if (aRole === "admin" && bRole !== "admin") return -1;
    if (aRole !== "admin" && bRole === "admin") return 1;
    return 0;
  });

  return (
    <div className="expanded-section1">
      <div
        className="members-header-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <h4 style={{ margin: 0 }}></h4>
        {(isOwner || isAdmin) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAdmin && (
              <button
                type="button"
                className="add-member-btn-plus group-admin-action-btn"
                onClick={() => {
                  setAssignAdminForm({ emailsText: "", role: "" });
                  setShowAssignAdminModal(true);
                }}
                style={{
                  background: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                title="Assign group admin"
                aria-label="Assign group admin"
              >
                <UserPlus size={20} weight="bold" />
              </button>
            )}
            <button
              className="add-member-btn-plus"
              onClick={() => setShowAddMemberModal(true)}
              style={{
                background: "#0076EA",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              title="Add Member"
              aria-label="Add member"
            >
              <Plus size={20} weight="bold" />
            </button>
          </div>
        )}
      </div>

      <div className="members-list">
        {sortedMembers.map((member) => {
          const roleVal = getEffectiveMemberRole(member, groupInfo);
          const isLeaderRole = roleVal === "owner" || roleVal === "admin";
          const label = isLeaderRole ? "Leader" : member.role || "Member";

          return (
            <div key={member.id} className="member-item">
              {member.user_photo ? (
                <img
                  src={member.user_photo || undefined}
                  alt={member.name}
                  className="member-avatar"
                />
              ) : (
                <div className="member-avatar-fallback">
                  {getInitials(member.name || member.email || "U")}
                </div>
              )}
              <div>
                <h5>{member.name}</h5>
                <p>{member.email}</p>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span className={`member-role ${isLeaderRole ? "admin-role" : ""}`}>
                  {label}
                </span>

                {isAdmin &&
                  ["admin", "owner"].includes(
                    getEffectiveMemberRole(member, groupInfo)
                  ) &&
                  member.email &&
                  String(member.email).trim().toLowerCase() !==
                  String(currentUserEmail || "").trim().toLowerCase() && (
                    <button
                      type="button"
                      className="remove-group-admin-btn"
                      onClick={() =>
                        openRemoveAdminModal(member, { readOnlyEmail: true })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#b45309",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "4px",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fffbeb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "none";
                      }}
                      title="Remove assigned admin"
                      aria-label="Remove assigned admin"
                    >
                      <UserMinus size={20} weight="bold" />
                    </button>
                  )}

                {isAdmin &&
                  member.email !== currentUserEmail &&
                  !["admin", "owner"].includes(
                    getEffectiveMemberRole(member, groupInfo)
                  ) && (
                    <button
                      className="delete-member-btn"
                      onClick={() => {
                        setMemberToDelete(member);
                        setShowDeleteModal(true);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4f",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "4px",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#fff1f0")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                      title="Remove Member"
                    >
                      <Trash size={18} />
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDeleteModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToDelete?.name || "this member"} from the group?`}
        confirming={isDeletingMember}
      />

      {showAssignAdminModal && (
        <AssignGroupAdminMeetzaModal
          groupLabel={groupLabelForModals}
          formData={assignAdminForm}
          setFormData={setAssignAdminForm}
          onSubmit={handleAssignGroupAdmin}
          onClose={() => {
            if (!assigningAdmin) setShowAssignAdminModal(false);
          }}
          saving={assigningAdmin}
        />
      )}

      {showRemoveAdminModal && (
        <RemoveGroupAdminMeetzaModal
          groupLabel={groupLabelForModals}
          email={removeAdminEmail}
          setEmail={setRemoveAdminEmail}
          emailReadOnly={removeAdminEmailReadOnly}
          onConfirm={handleRemoveGroupAdmin}
          onClose={() => {
            if (!removingAdmin) {
              setShowRemoveAdminModal(false);
              setRemoveAdminEmail("");
              setRemoveAdminEmailReadOnly(false);
            }
          }}
          saving={removingAdmin}
        />
      )}

      {showAddMemberModal && (
        <div
          className="add-member-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            className="add-member-modal"
            style={{
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "400px",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)" }}>
                Add New Member
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: "var(--text-primary)",
                }}
              >
                Member Email
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                className="form-control"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-light)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddMember();
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="btn btn-light"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--bg-light)",
                  color: "var(--text-primary)",
                  border: "none",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={isAdding}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--primary-color)",
                  color: "white",
                  border: "none",
                }}
              >
                {isAdding ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
