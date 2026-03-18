import React, { useMemo } from "react";
import VideoSessionDetail from "../../VideoSessions/components/VideoSessionDetail";

export default function SavedVideosDetail({
  session,
  savedVideos,
  onVideoDeleted,
  onBack,
  onSelectSession,
  onUnsave,
}) {
  const otherSavedVideos = useMemo(() => {
    return (savedVideos || []).filter((v) => String(v.id) !== String(session?.id));
  }, [savedVideos, session?.id]);

  if (!session) return null;

  return (
    <div className="saved-videos-detail">
      <VideoSessionDetail
        session={session}
        relatedSessions={otherSavedVideos}
        onBack={onBack}
        onSelectSession={onSelectSession}
        useGlobalRelated={false}
        isAdmin={false}
        onVideoDeleted={onVideoDeleted}
        onUnsave={onUnsave}
      />
    </div>
  );
}

