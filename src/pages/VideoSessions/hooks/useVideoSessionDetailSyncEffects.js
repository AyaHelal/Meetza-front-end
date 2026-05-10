import { useEffect } from "react";
import {
  getVideoDetail,
  getVideoComments,
  getVideoWatchProgress,
  isVideoSavedByUser,
} from "../services";
import { nestComments } from "../services/videoSessionCommentsUtils";
import { normalizeSavedFlag } from "../services/videoSessionDetailSavedUtils";
import {
  buildParsedVideoDetail,
  extractLikeDislikeState,
  mergeSocketVideoDetail,
} from "../services/videoSessionDetailMappers";
import { fetchRelatedVideosForSession } from "../services/videoSessionRelatedLoader";

/**
 * Initial load, related videos list, and socket-driven detail refresh.
 */
export function useVideoSessionDetailSyncEffects({
  session,
  user,
  socket,
  useGlobalRelated,
  detail,
  setDetail,
  setComments,
  setSaved,
  setLiked,
  setDisliked,
  setLikeDislikeRecordId,
  setLoadingDetail,
  setDetailError,
  setRelatedVideos,
  resumeAppliedRef,
}) {
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session?.id) return;
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const [data, commentsData, watchState] = await Promise.all([
          getVideoDetail(session.id),
          getVideoComments(session.id).catch(() => null),
          getVideoWatchProgress(session.id),
        ]);

        if (cancelled) return;

        const v = data.video ?? {};
        const resumeSec = watchState.progressSeconds;
        resumeAppliedRef.current = false;
        const admin = data.admin ?? {};

        const finalComments =
          commentsData && Array.isArray(commentsData.comments)
            ? commentsData.comments
            : Array.isArray(data.comments)
              ? data.comments
              : [];

        const finalCommentCount =
          commentsData && typeof commentsData.commentCount === "number"
            ? commentsData.commentCount
            : data.commentCount ?? finalComments.length;

        const parsedDetail = buildParsedVideoDetail({
          session,
          v,
          data,
          admin,
          finalCommentCount,
          resumeSec,
          watchState,
        });

        const rawSaved = data.is_saved ?? data.isSaved ?? data.saved ?? null;
        const hasUserSavedFlag = rawSaved !== null && rawSaved !== undefined;
        const normalizedSaved = normalizeSavedFlag(rawSaved);

        let finalSaved = normalizedSaved;
        if (!hasUserSavedFlag) {
          try {
            finalSaved = await isVideoSavedByUser(session.id);
          } catch {
            finalSaved = normalizedSaved;
          }
        }

        setSaved(finalSaved);
        setDetail(parsedDetail);
        const { likeId, isLiked, isDisliked } = extractLikeDislikeState(data, v);
        setLikeDislikeRecordId(likeId);
        setLiked(isLiked);
        setDisliked(isDisliked);

        const nested = nestComments(finalComments);
        setComments(nested);
      } catch (err) {
        if (!cancelled) setDetailError(err?.message || "Failed to load video details");
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror original: only re-fetch when session id / user id changes
  }, [session?.id, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!session?.id) return;
      try {
        const list = await fetchRelatedVideosForSession(session, useGlobalRelated);
        if (!cancelled) setRelatedVideos(list);
      } catch (err) {
        console.warn("Failed to fetch related videos", err);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, useGlobalRelated]);

  useEffect(() => {
    if (!socket || !session?.id) return;
    const refreshVideoDetail = async () => {
      try {
        const data = await getVideoDetail(session.id);
        const commentsData = await getVideoComments(session.id);
        setDetail((prev) => mergeSocketVideoDetail(prev, detail, session, data, commentsData));
        setComments((prev) => {
          const expandedIds = new Set(prev.filter(c => c.showReplies).map(c => c.id));
          const fresh = nestComments(Array.isArray(commentsData.comments) ? commentsData.comments : []);
          return fresh.map(c => ({ ...c, showReplies: expandedIds.has(c.id) }));
        });
      } catch (err) {
        console.error("Error refreshing video detail from socket event", err);
      }
    };
    const onVideoEvent = (payload) => {
      if (!payload) return;
      const videoId = payload.video_id || payload.id || payload.videoId;
      if (videoId && videoId !== session.id) return;
      refreshVideoDetail();
    };
    const events = [
      "videoUpdated",
      "videoLikeUpdated",
      "videoDislikeUpdated",
      "videoSavedUpdated",
      "videoCommentUpdated",
      "videoActivity",
      "newNotification",
      "new_notification",
    ];
    events.forEach((eventName) => socket.on(eventName, onVideoEvent));
    return () => events.forEach((eventName) => socket.off(eventName, onVideoEvent));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally stale `detail` in merge (same as original)
  }, [socket, session?.id]);
}
