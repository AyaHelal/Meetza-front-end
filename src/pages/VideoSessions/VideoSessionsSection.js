import React from "react";
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

  return (
    <div className="video-sessions-page video-sessions-section">
      <VideoSessionsHeader
        onBack={handleHeaderBack}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search"
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
            <p className="video-sessions-empty">No video sessions found.</p>
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
