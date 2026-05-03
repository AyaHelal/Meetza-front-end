import { useVideoSessionDetailView } from "../hooks/useVideoSessionDetailView";
import { VideoSessionDetailLayout } from "./VideoSessionDetailLayout";

export default function VideoSessionDetail({
  session,
  relatedSessions,
  onBack,
  onSelectSession,
  useGlobalRelated = false,
  isAdmin = false,
  onVideoDeleted,
  onUnsave,
  autoScrollToComments = false,
}) {
  const view = useVideoSessionDetailView({
    session,
    relatedSessions,
    onBack,
    onSelectSession,
    useGlobalRelated,
    isAdmin,
    onVideoDeleted,
    onUnsave,
    autoScrollToComments,
  });

  if (!view.session) return null;

  return <VideoSessionDetailLayout {...view} />;
}
