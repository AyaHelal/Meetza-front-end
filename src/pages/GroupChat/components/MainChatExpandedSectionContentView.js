import React from "react";
import { Trash, X } from "@phosphor-icons/react";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";
import { TabbedSection } from "./MainChatExpandedSectionResourceViews";

export default function MainChatExpandedSectionContentView({
  activeSection,
  expandedSection,
  contentName,
  isEditingContent,
  titleInputRef,
  editVal,
  setEditVal,
  handleSaveContentName,
  handleTitleKeyDown,
  setIsEditingContent,
  mediaTabResources,
  mediaTab,
  setMediaTab,
  contentResources,
  contentTab,
  setContentTab,
  onMediaClick,
  isAdmin,
  handleUploadClick,
  setShowAddLinkModal,
  handleContextMenu,
  handleTouchStart,
  handleTouchEnd,
  handleClick,
  contextMenu,
  setResourceToDelete,
  setShowDeleteResourceModal,
  setContextMenu,
  showDeleteResourceModal,
  handleDeleteResource,
  isDeletingResource,
  fileInputRef,
  handleFileChange,
  showAddLinkModal,
  newLinkUrl,
  setNewLinkUrl,
  handleAddLinkResource,
  isSubmittingLink,
}) {
  let expandedContentBody = null;

  if (activeSection === "media") {
    expandedContentBody = (
      <>

        <TabbedSection
          source={mediaTabResources}
          tabValue={mediaTab}
          onTabChange={setMediaTab}
          onMediaClick={onMediaClick}
          onContextMenu={null}
          onTouchStart={null}
          onTouchEnd={null}
          isAdmin={isAdmin}
          showUploadLinkActions={false}
          onUploadFile={handleUploadClick}
          onAddLink={() => setShowAddLinkModal(true)}
        />
      </>
    );
  } else if (activeSection === "contents") {
    expandedContentBody = (
      <>

        <TabbedSection
          source={contentResources}
          tabValue={contentTab}
          onTabChange={setContentTab}
          onMediaClick={onMediaClick}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          isAdmin={isAdmin}
          showUploadLinkActions
          onUploadFile={handleUploadClick}
          onAddLink={() => setShowAddLinkModal(true)}
        />
      </>
    );
  }

  return (
    <div className="expanded-section1" onClick={handleClick}>
      {contentName &&
        (expandedSection === "contents" || activeSection === "contents") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 20px 4px 20px",
              width: "100%",
            }}
          >
            {isEditingContent ? (
              <input
                ref={titleInputRef}
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={handleSaveContentName}
                onKeyDown={handleTitleKeyDown}
                style={{
                  fontSize: "18px",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-light)",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  outline: "none",
                  width: "fit-content",
                  minWidth: "200px",
                  textAlign: "center",
                }}
              />
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingContent(true);
                }}
                style={{
                  fontSize: "18px",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  cursor: "text",
                  padding: "6px 16px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  borderRadius: "6px",
                  transition: "background-color 0.2s",
                  display: "inline-block",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
                title="Click to edit content name"
              >
                {contentName}
              </span>
            )}
          </div>
        )}

      {expandedContentBody}

      {contextMenu.visible && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "var(--card-bg)",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "8px",
            padding: "4px 0",
            zIndex: 1000000,
            minWidth: "120px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setResourceToDelete(contextMenu.item);
              setShowDeleteResourceModal(true);
              setContextMenu({ ...contextMenu, visible: false });
            }}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "none",
              border: "none",
              textAlign: "left",
              color: "#ff4d4f",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9rem",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--bg-light)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Trash size={16} />
            Delete
          </button>
        </div>
      )}

      <ConfirmDeleteModal
        show={showDeleteResourceModal}
        onClose={() => setShowDeleteResourceModal(false)}
        onConfirm={handleDeleteResource}
        title="Delete Resource"
        message="Are you sure you want to permanently delete this resource?"
        confirming={isDeletingResource}
      />

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showAddLinkModal && (
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
          onClick={() => setShowAddLinkModal(false)}
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
            onClick={(e) => {
              e.stopPropagation();
            }}
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
                Add External Link
              </h3>
              <button
                onClick={() => setShowAddLinkModal(false)}
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
                Link URL
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                className="form-control"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
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
                  if (e.key === "Enter") handleAddLinkResource();
                }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowAddLinkModal(false)}
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
                onClick={handleAddLinkResource}
                disabled={isSubmittingLink}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--secondary-color)",
                  color: "white",
                  border: "none",
                }}
              >
                {isSubmittingLink ? "Adding..." : "Add Link"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
