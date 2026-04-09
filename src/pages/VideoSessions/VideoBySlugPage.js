import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoSessionDetail from "./components/VideoSessionDetail";
import { getVideoBySlug, parseSession } from "./services";
import "./VideoSessions.css";

export default function VideoBySlugPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getVideoBySlug(slug);
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

  const relatedSessions = useMemo(() => [], []);

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
      <VideoSessionDetail
        session={session}
        relatedSessions={relatedSessions}
        onBack={() => navigate(-1)}
        onSelectSession={() => {}}
        useGlobalRelated={false}
        isAdmin={false}
        autoScrollToComments
      />
    </div>
  );
}
