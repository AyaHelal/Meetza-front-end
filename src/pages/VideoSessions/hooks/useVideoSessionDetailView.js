import React from "react";
import { useVideoSessionDetail } from "./useVideoSessionDetail";
import { downloadVideo } from "../../../utils/videoUtils";

/**
 * Local UI state + share/download handlers + computed URLs for VideoSessionDetail.
 * Wraps useVideoSessionDetail with the same options as the original component.
 */
export function useVideoSessionDetailView({
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
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);
  const commentsSectionRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const [showVideoDeleteModal, setShowVideoDeleteModal] = React.useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = React.useState(null);
  const shareCopiedTimeoutRef = React.useRef(null);

  const api = useVideoSessionDetail(session, {
    relatedSessions,
    onBack,
    onSelectSession,
    useGlobalRelated,
    isAdmin,
    onVideoDeleted,
    onUnsave,
  });

  React.useEffect(() => {
    if (!autoScrollToComments) return;
    if (!session?.id) return;
    const t = window.setTimeout(() => {
      commentsSectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [autoScrollToComments, session?.id]);

  const handleDownloadClick = React.useCallback(() => {
    downloadVideo(
      session?.video_url || session?.videoUrl,
      api.title,
      () => setDownloading(true),
      () => setDownloading(false),
      () => {
        setDownloading(false);
        alert("Failed to download video. Please try again.");
      }
    );
  }, [session?.video_url, session?.videoUrl, api.title]);

  const sharePath = session
    ? `/video/${encodeURIComponent((session?.slug ?? session?.title ?? "").toString().trim())}`
    : "";
  const shareUrl = session ? `${window.location.origin}${sharePath}` : "";

  const handleCopyShare = React.useCallback(
    async (e) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = shareUrl;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setShareCopied(true);
        if (shareCopiedTimeoutRef.current) window.clearTimeout(shareCopiedTimeoutRef.current);
        shareCopiedTimeoutRef.current = window.setTimeout(() => setShareCopied(false), 1500);
      } catch {
        // ignore
      }
    },
    [shareUrl]
  );

  const thumbUrl = session
    ? api.thumbnailUrl ||
      session?.thumbnailUrl ||
      session?.thumbnail_url ||
      session?.poster_url ||
      null
    : null;

  const groupLabel = session
    ? api.groupName ?? session?.groupName ?? session?.group_name ?? null
    : null;

  if (!session) {
    return { session: null };
  }

  return {
    session,
    ...api,
    shareOpen,
    setShareOpen,
    shareCopied,
    commentsSectionRef,
    downloading,
    showVideoDeleteModal,
    setShowVideoDeleteModal,
    commentToDeleteId,
    setCommentToDeleteId,
    handleDownloadClick,
    handleCopyShare,
    thumbUrl,
    groupLabel,
    sharePath,
    shareUrl,
  };
}
