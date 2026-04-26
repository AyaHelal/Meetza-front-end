import { useCallback } from "react";
import {
  createLike,
  deleteLike,
  saveVideo,
  deleteSavedVideo,
  invalidateSavedVideosCache,
  createComment,
  getVideoComments,
  editComment as editCommentAPI,
  deleteComment as deleteCommentAPI,
  updateVideo,
  deleteVideo,
  getVideoDetail,
} from "../services";
import { nestComments } from "../services/videoSessionCommentsUtils";
import {
  formatTime as formatTimeUtil,
  formatRelativeTime as formatRelativeTimeUtil,
  formatFullDate as formatFullDateUtil,
  isRTL as isRTLUtil,
} from "../services/videoSessionDetailFormatters";
import { smartToast } from "../../../API/toastManager";

/**
 * Like/summary/save/edit/delete + comments/replies + date formatters for video detail.
 */
export function useVideoSessionDetailInteractions({
  session,
  user,
  detail,
  setDetail,
  liked,
  disliked,
  setLiked,
  setDisliked,
  setLikeDislikeRecordId,
  commentText,
  setCommentText,
  setCommentSubmitting,
  setComments,
  editingCommentId,
  editCommentText,
  setEditCommentText,
  setEditCommentSubmitting,
  setEditingCommentId,
  replyDrafts,
  setReplyDrafts,
  setReplySubmittingForId,
  savedRef,
  saveInFlightRef,
  setSaved,
  onUnsave,
  setSummaryLang,
  setLoadingSummary,
  setSummaryData,
  setShowSummary,
  editForm,
  setEditForm,
  setShowEditModal,
  setEditSubmitting,
  setDeleting,
  onVideoDeleted,
  onBack,
}) {
  const handleLikeAction = useCallback(
    async (likeType) => {
      if (!session?.id) return;
      const isLike = likeType === 1;
      const alreadyLiked = isLike && liked;
      const alreadyDisliked = !isLike && disliked;
      try {
        if (alreadyLiked || alreadyDisliked) {
          await deleteLike(session.id);
          setLikeDislikeRecordId(null);
          if (alreadyLiked) {
            setLiked(false);
            setDetail((prev) => ({ ...prev, likesCount: Math.max(0, (prev?.likesCount ?? 1) - 1) }));
          } else {
            setDisliked(false);
            setDetail((prev) => ({ ...prev, dislikesCount: Math.max(0, (prev?.dislikesCount ?? 1) - 1) }));
          }
          return;
        }
        const result = await createLike(session.id, likeType);
        const responseData = result?.data ?? result;
        const recordId = responseData?.id ?? responseData?.like_id ?? responseData?.data?.id ?? responseData?.like?.id;
        if (recordId) setLikeDislikeRecordId(recordId);
        const serverLikes = responseData?.likes_count;
        const serverDislikes = responseData?.dislikes_count;
        const hasCountsFromServer = typeof serverLikes === "number" || typeof serverDislikes === "number";
        setDetail((prev) => {
          if (hasCountsFromServer) {
            return {
              ...prev,
              likesCount: typeof serverLikes === "number" ? serverLikes : (prev?.likesCount ?? 0),
              dislikesCount: typeof serverDislikes === "number" ? serverDislikes : (prev?.dislikesCount ?? 0),
            };
          }
          const prevLikes = prev?.likesCount ?? 0;
          const prevDislikes = prev?.dislikesCount ?? 0;
          if (isLike) {
            return { ...prev, likesCount: prevLikes + 1, dislikesCount: disliked ? Math.max(0, prevDislikes - 1) : prevDislikes };
          }
          return { ...prev, likesCount: liked ? Math.max(0, prevLikes - 1) : prevLikes, dislikesCount: prevDislikes + 1 };
        });
        if (isLike) {
          setLiked(true);
          setDisliked(false);
        } else {
          setDisliked(true);
          setLiked(false);
        }
      } catch (err) {
        console.error("Failed to submit like/dislike", err);
      }
    },
    [session?.id, liked, disliked, setDetail, setLiked, setDisliked, setLikeDislikeRecordId]
  );

  const handleSummarize = useCallback(
    async (lang) => {
      if (!session?.id) {
        smartToast.error("Video ID is missing");
        return;
      }
      setLoadingSummary(true);
      try {
        const res = await getVideoDetail(session.id, lang);
        // Handle both array and object response formats
        let data = res?.data ?? res;
        if (Array.isArray(data) && data.length > 0) {
          data = data[0];
        }
        const summaryDataRes = data?.summary;
        const transcriptData = data?.transcript;
        
        // Handle {ar, en} format
        let finalSummary = '';
        let finalTranscript = '';
        
        if (typeof summaryDataRes === 'object' && summaryDataRes !== null) {
          finalSummary = summaryDataRes[lang] || summaryDataRes.en || summaryDataRes.ar || '';
        } else if (typeof summaryDataRes === 'string') {
          finalSummary = summaryDataRes;
        }
        
        if (typeof transcriptData === 'object' && transcriptData !== null) {
          finalTranscript = transcriptData[lang] || transcriptData.en || transcriptData.ar || '';
        } else if (typeof transcriptData === 'string') {
          finalTranscript = transcriptData;
        }
        
        if (finalSummary || finalTranscript) {
          if (finalSummary === "No words were detected in the video.") finalSummary = "No summary available";
          if (!finalTranscript) finalTranscript = "No transcript available";
          if (finalSummary && finalTranscript && finalSummary.trim() === finalTranscript.trim()) finalTranscript = null;
          setSummaryData({ summary: finalSummary || "No summary available", transcript: finalTranscript });
          setShowSummary(true);
          smartToast.success("Summary loaded successfully!");
        } else {
          smartToast.error("No summary available for this video");
        }
      } catch (err) {
        smartToast.error("Failed to load summary: " + (err.message || "Unknown error"));
      } finally {
        setLoadingSummary(false);
      }
    },
    [session?.id, setLoadingSummary, setSummaryData, setShowSummary]
  );

  const handlePostComment = useCallback(async () => {
    if (!session?.id || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const postResult = await createComment(session.id, commentText.trim());
      setCommentText("");
      const addedComment = postResult?.data ?? postResult?.comment ?? postResult;
      if (addedComment) {
        const now = new Date().toISOString();
        const displayName = user?.name ?? user?.member_name ?? user?.memberName ?? "";
        const displayPhoto = user?.Member_photo ?? user?.member_photo ?? user?.photo ?? user?.avatar;
        const safeComment = {
          ...addedComment,
          timestamp: addedComment.timestamp || addedComment.created_at || addedComment.createdAt || now,
          member_name: addedComment.member_name ?? addedComment.author ?? addedComment.user_name ?? addedComment.name ?? displayName,
          author: addedComment.author ?? addedComment.member_name ?? addedComment.user_name ?? addedComment.name ?? displayName,
          Member_photo: addedComment.Member_photo ?? addedComment.member_photo ?? addedComment.avatar ?? addedComment.user_avatar ?? displayPhoto,
          member_photo: addedComment.member_photo ?? addedComment.Member_photo ?? addedComment.avatar ?? addedComment.user_avatar ?? displayPhoto,
          member_id: addedComment.member_id ?? addedComment.memberId ?? user?.id,
          memberId: addedComment.memberId ?? addedComment.member_id ?? user?.id,
        };
        setComments((prev) => [...prev, safeComment]);
        setDetail((prev) => ({ ...prev, commentCount: (prev?.commentCount ?? 0) + 1 }));
      } else {
        const latest = await getVideoComments(session.id);
        setComments(latest.comments);
        setDetail((prev) => ({ ...prev, commentCount: latest.commentCount ?? prev?.commentCount ?? 0 }));
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setCommentSubmitting(false);
    }
  }, [session?.id, commentText, user, setCommentText, setCommentSubmitting, setComments, setDetail]);

  const handleDeleteComment = useCallback(
    async (commentId) => {
      if (!commentId) return;
      try {
        await deleteCommentAPI(commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setDetail((prev) => ({ ...prev, commentCount: Math.max((prev?.commentCount ?? 1) - 1, 0) }));
        smartToast.success("Comment deleted");
      } catch (err) {
        console.error("Failed to delete comment", err);
        smartToast.error("Failed to delete comment. Please try again.");
      }
    },
    [setComments, setDetail]
  );

  const handleEditCommentOpen = useCallback(
    (comment) => {
      setEditingCommentId(comment.id);
      setEditCommentText(comment.comment_text || comment.text || "");
    },
    [setEditingCommentId, setEditCommentText]
  );

  const handleEditCommentClose = useCallback(() => {
    setEditingCommentId(null);
    setEditCommentText("");
  }, [setEditingCommentId, setEditCommentText]);

  const handleEditCommentSubmit = useCallback(async () => {
    if (!editingCommentId || !editCommentText.trim()) return;
    try {
      setEditCommentSubmitting(true);
      await editCommentAPI(editingCommentId, editCommentText.trim());
      setComments((prev) =>
        prev.map((c) => (c.id === editingCommentId ? { ...c, comment_text: editCommentText.trim() } : c))
      );
      handleEditCommentClose();
      smartToast.success("Comment updated");
    } catch (err) {
      console.error("Failed to edit comment", err);
      smartToast.error("Failed to edit comment. Please try again.");
    } finally {
      setEditCommentSubmitting(false);
    }
  }, [editingCommentId, editCommentText, handleEditCommentClose, setComments, setEditCommentSubmitting]);

  const handleSaveVideo = useCallback(async () => {
    if (!session?.id) return;
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    const wasSaved = savedRef.current;
    try {
      if (wasSaved) {
        if (typeof onUnsave === "function") {
          await onUnsave(session.id);
          return;
        }

        setSaved(false);
        setDetail((prev) => ({ ...prev, savedCount: Math.max(0, (prev?.savedCount ?? 1) - 1) }));
        await deleteSavedVideo(session.id);
        invalidateSavedVideosCache();
        smartToast.success("Video removed from saved");
      } else {
        setSaved(true);
        setDetail((prev) => ({ ...prev, savedCount: (prev?.savedCount ?? 0) + 1 }));
        await saveVideo(session.id);
        invalidateSavedVideosCache();
        smartToast.success("Video saved successfully");
      }
    } catch (err) {
      console.error("Failed to save/unsave video", err);
      setSaved(wasSaved);
      setDetail((prev) => {
        if (!prev) return prev;
        const cur = prev?.savedCount ?? 0;
        if (wasSaved) {
          return { ...prev, savedCount: cur + 1 };
        }
        return { ...prev, savedCount: Math.max(0, cur - 1) };
      });
      smartToast.error("Failed to save video. Please try again.");
    } finally {
      saveInFlightRef.current = false;
    }
  }, [session?.id, onUnsave, saveInFlightRef, savedRef, setSaved, setDetail]);

  const handleEditOpen = useCallback(() => {
    setEditForm({
      title: detail?.title ?? session?.title ?? "",
      description: detail?.description ?? session?.description ?? "",
    });
    setShowEditModal(true);
  }, [detail?.title, detail?.description, session?.title, session?.description, setEditForm, setShowEditModal]);

  const handleEditSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!session?.id || !editForm.title?.trim()) {
        smartToast.error("Title is required");
        return;
      }
      setEditSubmitting(true);
      try {
        await updateVideo(session.id, { title: editForm.title.trim(), description: editForm.description?.trim() ?? "" });
        setDetail((prev) => ({ ...prev, title: editForm.title.trim(), description: editForm.description?.trim() ?? "" }));
        setShowEditModal(false);
        smartToast.success("Video updated");
      } catch (err) {
        console.error("Failed to update video", err);
        smartToast.error(err?.response?.data?.message || err?.message || "Failed to update video");
      } finally {
        setEditSubmitting(false);
      }
    },
    [session?.id, editForm, setDetail, setShowEditModal, setEditSubmitting]
  );

  const handleDelete = useCallback(async () => {
    if (!session?.id) return;
    setDeleting(true);
    try {
      await deleteVideo(session.id);
      smartToast.success("Video deleted");
      onVideoDeleted?.(session.id);
      onBack?.();
    } catch (err) {
      console.error("Failed to delete video", err);
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to delete video");
    } finally {
      setDeleting(false);
    }
  }, [session?.id, onVideoDeleted, onBack, setDeleting]);

  const formatRelativeTime = useCallback((isoString) => formatRelativeTimeUtil(isoString), []);
  const formatFullDate = useCallback((dateString) => formatFullDateUtil(dateString), []);
  const formatTime = useCallback((seconds) => formatTimeUtil(seconds), []);
  const isRTL = useCallback((text) => isRTLUtil(text), []);

  const setReplyDraft = useCallback(
    (commentId, value) => {
      setReplyDrafts((prev) => ({ ...prev, [commentId]: value }));
    },
    [setReplyDrafts]
  );

  const toggleReplyInput = useCallback(
    (id) => {
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, showReplyInput: !c.showReplyInput } : c)));
    },
    [setComments]
  );

  const handlePostReply = useCallback(
    async (parentCommentId) => {
      if (!session?.id || !parentCommentId) return;
      const text = (replyDrafts[parentCommentId] ?? "").trim();
      if (!text) return;
      setReplySubmittingForId(parentCommentId);
      try {
        await createComment(session.id, text, parentCommentId);
        setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: "" }));
        toggleReplyInput(parentCommentId);
        const commentsData = await getVideoComments(session.id);
        const nested = nestComments(commentsData.comments ?? []);
        setComments(nested);
        setDetail((prev) => ({ ...prev, commentCount: commentsData.commentCount ?? (prev?.commentCount ?? 0) + 1 }));
        smartToast.success("Reply posted");
      } catch (err) {
        console.error("Failed to post reply", err);
        smartToast.error("Failed to post reply. Please try again.");
      } finally {
        setReplySubmittingForId(null);
      }
    },
    [session?.id, replyDrafts, toggleReplyInput, setReplyDrafts, setReplySubmittingForId, setComments, setDetail]
  );

  return {
    handleLikeAction,
    handleSummarize,
    handlePostComment,
    handleDeleteComment,
    handleEditCommentOpen,
    handleEditCommentClose,
    handleEditCommentSubmit,
    handleSaveVideo,
    handleEditOpen,
    handleEditSubmit,
    handleDelete,
    formatRelativeTime,
    formatFullDate,
    formatTime,
    isRTL,
    setReplyDraft,
    toggleReplyInput,
    handlePostReply,
  };
}
