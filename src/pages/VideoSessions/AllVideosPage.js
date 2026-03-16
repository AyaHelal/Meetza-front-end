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

  useEffect(() => {
    refetch();
  }, [refetch]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sessions;
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
              />
            ))
          )}
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

