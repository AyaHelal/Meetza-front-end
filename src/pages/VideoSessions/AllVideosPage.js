import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { ConfirmDeleteModal } from "../../components/shared/ConfirmDeleteModal";
import { buildPendingUploadSession, revokePendingUploadBlobs } from "./utils/pendingUploadPlaceholder";
import "./VideoSessions.css";

function AllVideosContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [postVideoModalOpen, setPostVideoModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingUploads, setPendingUploads] = useState([]);

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

  const handleDeleteFromCard = useCallback((session) => {
    if (!session?.id) return;
    setVideoToDelete(session);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (!videoToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteVideo(videoToDelete.id);
      smartToast.success("Video deleted");
      setVideoToDelete(null);
      refetch();
    } catch (err) {
      console.error("Failed to delete video", err);
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  }, [videoToDelete, refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleSelectSession = useCallback((session) => {
    const param = session?.slug ?? session?.id;
    if (param) {
      navigate(`/video/${encodeURIComponent(String(param))}`);
    }
  }, [navigate]);

  /** Open the same detail + related grid as clicking a card (e.g. from Home). */
  useEffect(() => {
    const id = location.state?.openVideoId;
    const slug = location.state?.openVideoSlug;
    const hasIntent =
      (id != null && String(id).trim() !== "") || (slug != null && String(slug).trim() !== "");
    if (!hasIntent) return;
    if (loading) return;

    const idNorm = id != null && String(id).trim() !== "" ? String(id) : null;
    const slugNorm = slug != null && String(slug).trim() !== "" ? String(slug) : null;

    const param = slugNorm || idNorm;
    if (param) {
      navigate(`/video/${encodeURIComponent(param)}`, { replace: true });
    }
  }, [loading, location.state, location.search, navigate]);

  const handleUploadBegin = useCallback((payload) => {
    setPendingUploads((prev) => [buildPendingUploadSession(payload), ...prev]);
  }, []);

  const handleUploadEnd = useCallback((uploadId) => {
    setPendingUploads((prev) => {
      const row = prev.find((p) => p.id === uploadId);
      if (row) revokePendingUploadBlobs(row);
      return prev.filter((p) => p.id !== uploadId);
    });
  }, []);

  const filteredSessions = useMemo(() => {
    const merged = [...pendingUploads, ...sessions];
    const q = searchQuery.toLowerCase().trim();
    if (q.length < 3) return merged;
    return merged.filter((s) => {
      const title = (s.title || "").toLowerCase();
      const group = (s.groupName ?? s.group_name ?? "").toLowerCase();
      return title.includes(q) || (group && group.includes(q));
    });
  }, [sessions, searchQuery, pendingUploads]);

  const handleBack = () => {
    navigate("/home", { replace: true });
  };

  const handleHeaderBack = handleBack;

  return (
    <div className="video-sessions-page all-videos-page">
      <VideoSessionsHeader
        onBack={handleHeaderBack}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search videos"
        sessions={sessions}
        onSubmitSearch={() => {}}
        isAdmin={isAdmin}
        onPostVideoClick={() => setPostVideoModalOpen(true)}
        groupId={null}
        subtitle="All videos you can access — group name is on each card."
      />
      <PostVideoModal
        isOpen={postVideoModalOpen}
        onClose={() => setPostVideoModalOpen(false)}
        onUploadBegin={handleUploadBegin}
        onUploadEnd={handleUploadEnd}
        onSuccess={() => refetch()}
      />

      {error && (
        <div className="video-sessions-error">
          {error}
        </div>
      )}

      {loading ? (
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
                onClick={() => !session._uploadPlaceholder && handleSelectSession(session)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        show={!!videoToDelete}
        onClose={() => setVideoToDelete(null)}
        onConfirm={onConfirmDelete}
        title="Delete Video"
        message={`Are you sure you want to delete "${videoToDelete?.title}"? This cannot be undone.`}
        confirming={isDeleting}
        confirmLabel="Delete"
      />
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

