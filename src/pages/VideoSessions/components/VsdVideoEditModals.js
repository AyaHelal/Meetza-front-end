import React from "react";

export function VsdVideoEditModals({
  showEditModal,
  setShowEditModal,
  editSubmitting,
  editForm,
  setEditForm,
  handleEditSubmit,
  editingCommentId,
  editCommentText,
  setEditCommentText,
  editCommentSubmitting,
  handleEditCommentClose,
  handleEditCommentSubmit,
}) {
  return (
    <>
      {showEditModal && (
        <div
          className="video-edit-modal-overlay"
          onClick={() => !editSubmitting && setShowEditModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-video-title"
        >
          <div className="video-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-edit-modal-header">
              <h3 id="edit-video-title">Edit video</h3>
              <button
                type="button"
                className="video-edit-modal-close"
                onClick={() => !editSubmitting && setShowEditModal(false)}
                aria-label="Close"
                disabled={editSubmitting}
              >
                ×
              </button>
            </div>
            <form className="video-edit-modal-form" onSubmit={handleEditSubmit}>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-title-input">Title</label>
                <input
                  id="edit-video-title-input"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Video title"
                  required
                />
              </div>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-description">Description</label>
                <textarea
                  id="edit-video-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Video description"
                  rows={3}
                />
              </div>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-poster">Poster image</label>
                <input
                  id="edit-video-poster"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditForm((prev) => ({ ...prev, poster_file: e.target.files?.[0] || null }))}
                />
                {editForm.poster_file && (
                  <span className="small text-muted d-block mt-1" style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                    Selected: {editForm.poster_file.name}
                  </span>
                )}
              </div>
              <div className="video-edit-modal-actions">
                <button
                  type="button"
                  className="video-edit-btn video-edit-btn-cancel"
                  onClick={() => setShowEditModal(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="video-edit-btn video-edit-btn-submit" disabled={editSubmitting}>
                  {editSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCommentId && (
        <div
          className="video-edit-modal-overlay"
          onClick={() => !editCommentSubmitting && handleEditCommentClose()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-comment-title"
        >
          <div className="video-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-edit-modal-header">
              <h3 id="edit-comment-title">Edit comment</h3>
              <button
                type="button"
                className="video-edit-modal-close"
                onClick={() => !editCommentSubmitting && handleEditCommentClose()}
                aria-label="Close"
                disabled={editCommentSubmitting}
              >
                ×
              </button>
            </div>
            <form
              className="video-edit-modal-form"
              onSubmit={(e) => { e.preventDefault(); handleEditCommentSubmit(); }}
            >
              <div className="video-edit-form-group">
                <label htmlFor="edit-comment-text">Comment</label>
                <textarea
                  id="edit-comment-text"
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  placeholder="Edit your comment"
                  rows={3}
                  required
                />
              </div>
              <div className="video-edit-modal-actions">
                <button
                  type="button"
                  className="video-edit-btn video-edit-btn-cancel"
                  onClick={handleEditCommentClose}
                  disabled={editCommentSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="video-edit-btn video-edit-btn-submit"
                  disabled={editCommentSubmitting}
                >
                  {editCommentSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
