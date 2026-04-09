import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { VideoSessionsProvider } from "./store/videoSessionsStore";
import { useVideoSessions } from "./hooks/useVideoSessions";
import { useAuth } from "../../context/AuthContext";
import VideoSessionsHeader from "./components/VideoSessionsHeader";
import VideoSessionCard from "./components/VideoSessionCard";
import PostVideoModal from "./components/PostVideoModal";
import "./VideoSessions.css";

function VideoSessionsContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group_id") || null;
  const groupNameParam = searchParams.get("group_name");
  const groupNameFromUrl = groupNameParam
    ? (() => {
        try {
          return decodeURIComponent(String(groupNameParam).replace(/\+/g, " "));
        } catch {
          return String(groupNameParam);
        }
      })()
    : null;
  const { user } = useAuth();
  const [postVideoModalOpen, setPostVideoModalOpen] = useState(false);

  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const isAdmin = userRole.includes("administrator") || userRole.includes("super_admin") || userRole.includes("super-admin");

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
    refetch,
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
        onSubmitSearch={() => {}}
        isAdmin={isAdmin}
        onPostVideoClick={() => setPostVideoModalOpen(true)}
        groupId={groupId}
        groupName={groupNameFromUrl}
      />
      <PostVideoModal
        isOpen={postVideoModalOpen}
        onClose={() => setPostVideoModalOpen(false)}
        defaultGroupId={groupId}
        onSuccess={() => refetch?.()}
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
