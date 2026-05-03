import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoSessionDetail from "./components/VideoSessionDetail";
import VideoSessionsHeader from "./components/VideoSessionsHeader";
import PostVideoModal from "./components/PostVideoModal";
import { getVideoBySlug, parseSession } from "./services";
import { getAllVideos, mapVideoToSession } from "./services/allVideosService";
import { useAuth } from "../../context/AuthContext";
import { buildPendingUploadSession, revokePendingUploadBlobs } from "./utils/pendingUploadPlaceholder";
import "./VideoSessions.css";

export default function VideoBySlugPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [relatedSessions, setRelatedSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [postVideoModalOpen, setPostVideoModalOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState([]);

  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const isAdmin = userRole.includes("administrator") || userRole.includes("super_admin") || userRole.includes("super-admin");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const [data, allVideosRaw] = await Promise.all([
          getVideoBySlug(slug),
          getAllVideos().catch(() => [])
        ]);
        if (cancelled) return;
        const v = data?.video ?? data?.data?.video ?? data?.data ?? data;
        const parsed = parseSession(v || {});

        const fallbackId =
          parsed?.id ??
          v?.id ??
          v?.video_id ??
          v?.videoId ??
          data?.id ??
          data?.video_id ??
          data?.videoId ??
          null;

        const groupLabel = parsed?.groupName ?? parsed?.group_name ?? v?.group_name ?? null;
        setSession({
          ...parsed,
          id: fallbackId,
          title: parsed?.title ?? v?.title ?? (typeof slug === "string" ? slug : "Video Title"),
          slug: parsed?.slug ?? v?.slug ?? (typeof slug === "string" ? slug : undefined),
          group_name: groupLabel,
          groupName: groupLabel,
        });

        const parsedRelated = (allVideosRaw || []).map(mapVideoToSession);
        setRelatedSessions(parsedRelated);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || "Failed to load video");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

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

  const relatedSessionsWithPending = useMemo(
    () => [...pendingUploads, ...relatedSessions],
    [pendingUploads, relatedSessions]
  );

  const handleSelectRelated = useCallback(
    (next) => {
      if (!next || next._uploadPlaceholder) return;
      const param = next.slug ?? next.id;
      if (param == null || String(param).trim() === "") return;
      navigate(`/video/${encodeURIComponent(String(param))}`);
    },
    [navigate],
  );

  if (loading) {
    return (
      <div className="video-sessions-page all-videos-page">
        <div className="video-sessions-loading">Loading video…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-sessions-page all-videos-page">
        <div className="video-sessions-error">
          {error}
          <div style={{ marginTop: 12 }}>
            <button type="button" className="video-sessions-back" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="video-sessions-page all-videos-page">
        <div className="video-sessions-empty-state">
          <p className="video-sessions-empty-text">Video not found.</p>
          <button type="button" className="video-sessions-back" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-sessions-page all-videos-page">
      <VideoSessionsHeader
        onBack={() => navigate(-1)}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search videos"
        onSubmitSearch={() => {}}
        isAdmin={isAdmin}
        onPostVideoClick={() => setPostVideoModalOpen(true)}
      />
      <PostVideoModal
        isOpen={postVideoModalOpen}
        onClose={() => setPostVideoModalOpen(false)}
        onUploadBegin={handleUploadBegin}
        onUploadEnd={handleUploadEnd}
        onSuccess={() => window.location.reload()}
      />
      <VideoSessionDetail
        session={session}
        relatedSessions={relatedSessionsWithPending}
        onBack={() => navigate(-1)}
        onSelectSession={handleSelectRelated}
        useGlobalRelated
        isAdmin={isAdmin}
        autoScrollToComments
      />
    </div>
  );
}
