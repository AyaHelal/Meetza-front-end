import React, { useState } from "react";
import Lottie from "lottie-react";
import noDataFoundAnimation from "../../lottie/noDataFound.json";
import { useAuth } from "../../context/AuthContext";
import { useVideoSessions } from "./hooks/useVideoSessions";
import VideoSessionsHeader from "./components/VideoSessionsHeader";
import VideoSessionCard from "./components/VideoSessionCard";
import VideoSessionDetail from "./components/VideoSessionDetail";
import PostVideoModal from "./components/PostVideoModal";
import { updateVideo, deleteVideo } from "./services";
import { smartToast } from "../../API/toastManager";
import "./VideoSessions.css";

/**
 * Video Sessions block for in-page section (e.g. on group chat page).
 * Must be rendered inside VideoSessionsProvider. onBack typically scrolls back to top.
 */
export default function VideoSessionsSection({ onBack, groupId = null, groupName = null }) {
  const { user } = useAuth();
  const [postVideoModalOpen, setPostVideoModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const isAdmin = userRole.includes("administrator") || userRole.includes("super_admin") || userRole.includes("super-admin");

  const {
    sessions,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedSession,
    setSelectedSession,
    refetch,
  } = useVideoSessions(groupId);

  const handleEditFromCard = (session) => {
    setSessionToEdit(session);
    setEditForm({
      title: session?.title ?? "",
      description: session?.description ?? "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e?.preventDefault?.();
    if (!sessionToEdit?.id || !editForm.title?.trim()) {
      smartToast.error("Title is required");
      return;
    }
    setEditSubmitting(true);
    try {
      await updateVideo(sessionToEdit.id, { title: editForm.title.trim(), description: editForm.description?.trim() ?? "" });
      smartToast.success("Video updated");
      setShowEditModal(false);
      setSessionToEdit(null);
      refetch?.();
    } catch (err) {
      console.error("Failed to update video", err);
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to update video");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteFromCard = async (session) => {
    if (!session?.id) return;
    const confirmed = window.confirm("Are you sure you want to delete this video? This cannot be undone.");
    if (!confirmed) return;
    try {
      await deleteVideo(session.id);
      smartToast.success("Video deleted");
      if (selectedSession?.id === session.id) setSelectedSession(null);
      refetch?.();
    } catch (err) {
      console.error("Failed to delete video", err);
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to delete video");
    }
  };

  const handleHeaderBack = selectedSession ? () => setSelectedSession(null) : onBack;

  React.useEffect(() => {
    if (!onBack) return;

    const isReload = (() => {
      if (window.performance?.getEntriesByType) {
        const navigationEntry = window.performance.getEntriesByType("navigation")[0];
        return navigationEntry?.type === "reload";
      }
      return window.performance?.navigation?.type === 1;
    })();

    if (isReload) {
      onBack();
    }
  }, [onBack]);

  if (!groupId?.toString?.().trim?.()) {
    return (
      <div className="video-sessions-page video-sessions-section">
        <VideoSessionsHeader
          onBack={handleHeaderBack}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search"
          sessions={sessions || []}
          onSubmitSearch={() => setSelectedSession?.(null)}
          isAdmin={isAdmin}
          onPostVideoClick={() => setPostVideoModalOpen(true)}
          groupId={groupId}
        />
        <PostVideoModal
          isOpen={postVideoModalOpen}
          onClose={() => setPostVideoModalOpen(false)}
          defaultGroupId={groupId}
          groupName={groupName}
          onSuccess={() => refetch?.()}
        />
        <div className="video-sessions-empty">
          Please select a group and then try to view the videos.
        </div>
      </div>
    );
  }

  return (
    <div className="video-sessions-page video-sessions-section">
      <VideoSessionsHeader
        onBack={handleHeaderBack}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search"
        sessions={sessions || []}
        onSubmitSearch={() => setSelectedSession?.(null)}
        isAdmin={isAdmin}
        onPostVideoClick={() => setPostVideoModalOpen(true)}
      />
      <PostVideoModal
        isOpen={postVideoModalOpen}
        onClose={() => setPostVideoModalOpen(false)}
        defaultGroupId={groupId}
        groupName={groupName}
        onSuccess={() => refetch?.()}
      />

      {error && (
        <div className="video-sessions-error">
          {error}
        </div>
      )}

      {selectedSession ? (
        <VideoSessionDetail
          session={selectedSession}
          relatedSessions={sessions}
          onBack={() => setSelectedSession(null)}
          onSelectSession={setSelectedSession}
          isAdmin={isAdmin}
          onVideoDeleted={() => {
            setSelectedSession(null);
            refetch?.();
          }}
        />
      ) : loading ? (
        <div className="video-sessions-loading">Loading video sessions…</div>
      ) : (
        <div className="video-sessions-grid">
          {sessions.length === 0 ? (
            <div className="video-sessions-empty-state">
              <p className="video-sessions-empty-text">No videos have been updated for this group.</p>
              <div className="video-sessions-empty-illustration">
                <Lottie animationData={noDataFoundAnimation} loop style={{ maxHeight: 180 }} />
              </div>
            </div>
          ) : (
            sessions.map((session) => (
              <VideoSessionCard
                key={session.id ?? session.title}
                session={session}
                onClick={() => setSelectedSession(session)}
                isAdmin={isAdmin}
                onEdit={handleEditFromCard}
                onDelete={handleDeleteFromCard}
              />
            ))
          )}
        </div>
      )}

      {/* Edit video modal (from card menu) */}
      {showEditModal && sessionToEdit && (
        <div className="video-edit-modal-overlay" onClick={() => !editSubmitting && setShowEditModal(false)} role="dialog" aria-modal="true" aria-labelledby="edit-video-title-section">
          <div className="video-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-edit-modal-header">
              <h3 id="edit-video-title-section">Edit video</h3>
              <button type="button" className="video-edit-modal-close" onClick={() => !editSubmitting && setShowEditModal(false)} aria-label="Close" disabled={editSubmitting}>×</button>
            </div>
            <form className="video-edit-modal-form" onSubmit={handleEditSubmit}>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-title-input-section">Title</label>
                <input
                  id="edit-video-title-input-section"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Video title"
                  required
                />
              </div>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-description-section">Description</label>
                <textarea
                  id="edit-video-description-section"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Video description"
                  rows={3}
                />
              </div>
              <div className="video-edit-modal-actions">
                <button type="button" className="video-edit-btn video-edit-btn-cancel" onClick={() => setShowEditModal(false)} disabled={editSubmitting}>Cancel</button>
                <button type="submit" className="video-edit-btn video-edit-btn-submit" disabled={editSubmitting}>{editSubmitting ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
