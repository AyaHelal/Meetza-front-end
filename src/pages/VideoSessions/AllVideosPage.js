import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import noDataFoundAnimation from "../../lottie/noDataFound.json";
import { useAuth } from "../../context/AuthContext";
import { VideoSessionsProvider } from "./store/videoSessionsStore";
import VideoSessionsHeader from "./components/VideoSessionsHeader";
import VideoSessionCard from "./components/VideoSessionCard";
import VideoSessionDetail from "./components/VideoSessionDetail";
import PostVideoModal from "./components/PostVideoModal";
import { getAllVideos, mapVideoToSession } from "./services/allVideosService";
import { updateVideo, deleteVideo } from "./services";
import { smartToast } from "../../API/toastManager";
import "./VideoSessions.css";

function AllVideosContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [postVideoModalOpen, setPostVideoModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const isAdmin = userRole.includes("administrator") || userRole.includes("super_admin") || userRole.includes("super-admin");

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getAllVideos();
      const parsed = (raw || []).map(mapVideoToSession);
      setSessions(parsed);
    } catch (err) {
      setError(err?.message || "Failed to load videos");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEditFromCard = useCallback((session) => {
    setSessionToEdit(session);
    setEditForm({
      title: session?.title ?? "",
      description: session?.description ?? "",
    });
    setShowEditModal(true);
  }, []);

  const handleEditSubmit = useCallback(async (e) => {
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
      refetch();
    } catch (err) {
      console.error("Failed to update video", err);
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to update video");
    } finally {
      setEditSubmitting(false);
    }
  }, [sessionToEdit, editForm, refetch]);

  const handleDeleteFromCard = useCallback(async (session) => {
    if (!session?.id) return;
    const confirmed = window.confirm("Are you sure you want to delete this video? This cannot be undone.");
    if (!confirmed) return;
    try {
      await deleteVideo(session.id);
      smartToast.success("Video deleted");
      if (selectedSession?.id === session.id) setSelectedSession(null);
      refetch();
    } catch (err) {
      console.error("Failed to delete video", err);
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to delete video");
    }
  }, [selectedSession, refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q.length < 3) return sessions;
    return sessions.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const handleBack = () => {
    navigate("/home", { replace: true });
  };

  const handleHeaderBack = selectedSession ? () => setSelectedSession(null) : handleBack;

  return (
    <div className="video-sessions-page all-videos-page">
      <VideoSessionsHeader
        onBack={handleHeaderBack}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search videos"
        sessions={sessions}
        onSubmitSearch={() => setSelectedSession(null)}
        isAdmin={isAdmin}
        onPostVideoClick={() => setPostVideoModalOpen(true)}
        groupId={null}
      />
      <PostVideoModal
        isOpen={postVideoModalOpen}
        onClose={() => setPostVideoModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {error && (
        <div className="video-sessions-error">
          {error}
        </div>
      )}

      {selectedSession ? (
        <VideoSessionDetail
          session={selectedSession}
          relatedSessions={filteredSessions}
          onBack={() => setSelectedSession(null)}
          onSelectSession={setSelectedSession}
          useGlobalRelated
          isAdmin={isAdmin}
          onVideoDeleted={() => {
            setSelectedSession(null);
            refetch();
          }}
        />
      ) : loading ? (
        <div className="video-sessions-loading">Loading videos…</div>
      ) : (
        <div className="video-sessions-grid">
          {filteredSessions.length === 0 ? (
            <div className="video-sessions-empty-state">
              <p className="video-sessions-empty-text">No videos available.</p>
              <div className="video-sessions-empty-illustration">
                <Lottie animationData={noDataFoundAnimation} loop style={{ maxHeight: 180 }} />
              </div>
            </div>
          ) : (
            filteredSessions.map((session) => (
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
        <div className="video-edit-modal-overlay" onClick={() => !editSubmitting && setShowEditModal(false)} role="dialog" aria-modal="true" aria-labelledby="edit-video-title-all">
          <div className="video-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-edit-modal-header">
              <h3 id="edit-video-title-all">Edit video</h3>
              <button type="button" className="video-edit-modal-close" onClick={() => !editSubmitting && setShowEditModal(false)} aria-label="Close" disabled={editSubmitting}>×</button>
            </div>
            <form className="video-edit-modal-form" onSubmit={handleEditSubmit}>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-title-input-all">Title</label>
                <input
                  id="edit-video-title-input-all"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Video title"
                  required
                />
              </div>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-description-all">Description</label>
                <textarea
                  id="edit-video-description-all"
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

export default function AllVideosPage() {
  return (
    <VideoSessionsProvider>
      <AllVideosContent />
    </VideoSessionsProvider>
  );
}

