import React from "react";
import Lottie from "lottie-react";
import noDataFoundAnimation from "../../lottie/noDataFound.json";
import { useVideoSessions } from "./hooks/useVideoSessions";
import VideoSessionsHeader from "./components/VideoSessionsHeader";
import VideoSessionCard from "./components/VideoSessionCard";
import VideoSessionDetail from "./components/VideoSessionDetail";
import "./VideoSessions.css";

/**
 * Video Sessions block for in-page section (e.g. on group chat page).
 * Must be rendered inside VideoSessionsProvider. onBack typically scrolls back to top.
 */
export default function VideoSessionsSection({ onBack, groupId = null }) {
  const {
    sessions,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedSession,
    setSelectedSession,
  } = useVideoSessions(groupId);

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
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
