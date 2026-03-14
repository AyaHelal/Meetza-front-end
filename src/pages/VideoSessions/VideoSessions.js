import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { VideoSessionsProvider } from "./store/videoSessionsStore";
import { useVideoSessions } from "./hooks/useVideoSessions";
import VideoSessionsHeader from "./components/VideoSessionsHeader";
import VideoSessionCard from "./components/VideoSessionCard";
import "./VideoSessions.css";

function VideoSessionsContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group_id") || null;

  React.useEffect(() => {
    const isReload = (() => {
      if (window.performance?.getEntriesByType) {
        const [nav] = window.performance.getEntriesByType("navigation");
        return nav?.type === "reload";
      }
      return window.performance?.navigation?.type === 1;
    })();

    if (isReload) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);
  const {
    sessions,
    loading,
    error,
    searchQuery,
    setSearchQuery,
  } = useVideoSessions(groupId);

  const handleBack = () => {
    navigate("/home", { replace: true });
  };

  if (!groupId?.toString?.().trim?.()) {
    return (
      <div className="video-sessions-page">
        <div className="video-sessions-empty">
          Please open the group videos from the group page
        </div>
      </div>
    );
  }

  return (
    <div className="video-sessions-page">
      <VideoSessionsHeader
        onBack={handleBack}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search"
        sessions={sessions}
        onSubmitSearch={() => {
          // If a detail view were present, we'd clear it here. For VideoSessions, just letting the search apply is enough.
        }}
      />

      {error && (
        <div className="video-sessions-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="video-sessions-loading">Loading video sessions…</div>
      ) : (
        <div className="video-sessions-grid">
          {sessions.length === 0 ? (
            <p className="video-sessions-empty">No video sessions found.</p>
          ) : (
            sessions.map((session) => (
              <VideoSessionCard key={session.id ?? session.title} session={session} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoSessions() {
  return (
    <VideoSessionsProvider>
      <VideoSessionsContent />
    </VideoSessionsProvider>
  );
}
