import { useState, useRef, useEffect, useCallback } from "react";
import {
  getVideoDetail,
  createLike,
  deleteLike,
  saveVideo,
  deleteSavedVideo,
  isVideoSavedByUser,
  invalidateSavedVideosCache,
  getRelatedVideos,
  getGlobalRelatedVideos,
  createComment,
  getVideoComments,
  editComment as editCommentAPI,
  deleteComment as deleteCommentAPI,
  summarizeVideo,
  updateVideo,
  deleteVideo,
} from "../services";
import { useSocket } from "../../../context/SocketContext";
import { useAuth } from "../../../context/AuthContext";
import { smartToast } from "../../../API/toastManager";

export function useVideoSessionDetail(session, options = {}) {
  const {
    relatedSessions = [],
    onBack,
    onSelectSession,
    useGlobalRelated = false,
    isAdmin = false,
    onVideoDeleted,
    onUnsave,
  } = options;

  const { socket } = useSocket();
  const { user } = useAuth();

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeDislikeRecordId, setLikeDislikeRecordId] = useState(null);
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editCommentSubmitting, setEditCommentSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySubmittingForId, setReplySubmittingForId] = useState(null);

  useEffect(() => {
    savedRef.current = Boolean(saved);
  }, [saved]);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryLang, setSummaryLang] = useState("en");
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeControlRef = useRef(null);

  /** Build nested comments: roots have .replies from flat list with parent_id */
  const nestComments = useCallback((flatList) => {
    if (!Array.isArray(flatList) || flatList.length === 0) return [];
    const hasParentId = flatList.some((c) => c.hasOwnProperty("parent_id") && c.parent_id != null && c.parent_id !== "");
    if (!hasParentId) return flatList;
    const roots = flatList.filter((c) => c.parent_id == null || c.parent_id === undefined || c.parent_id === "");
    return roots.map((r) => ({ ...r, replies: flatList.filter((c) => c.parent_id === r.id) || [] }));
  }, []);

  useEffect(() => {
    if (!loadingSummary && showLangDropdown) {
      const timer = setTimeout(() => setShowLangDropdown(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loadingSummary, showLangDropdown]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLangDropdown && !event.target.closest(".summary-container")) setShowLangDropdown(false);
      if (showAdminMenu && adminMenuRef.current && !adminMenuRef.current.contains(event.target)) setShowAdminMenu(false);
      if (showVolumeSlider && volumeControlRef.current && !volumeControlRef.current.contains(event.target)) setShowVolumeSlider(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLangDropdown, showAdminMenu, showVolumeSlider]);

  useEffect(() => {
    setShowSummary(false);
    setSummaryData(null);
    setSummaryLang("en");
    setShowLangDropdown(false);
    setLoadingSummary(false);
    setShowAdminMenu(false);
    setLikeDislikeRecordId(null);
  }, [session?.id]);

  const handleLikeAction = useCallback(async (likeType) => {
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
  }, [session?.id, liked, disliked]);

  const handleSummarize = useCallback(async (lang) => {
    const videoUrl = detail?.videoUrl || session?.videoUrl || null;
    if (!videoUrl) {
      smartToast.error("Video URL is missing");
      return;
    }
    setSummaryLang(lang || "en");
    setLoadingSummary(true);
    try {
      const response = await summarizeVideo(session.id, videoUrl, lang);
      const summaryDataRes = response?.data?.summary || response?.summary || response?.data?.data?.summary;
      const transcriptData = response?.data?.transcript || response?.transcript || response?.data?.data?.transcript;
      if (summaryDataRes || transcriptData) {
        let finalSummary = summaryDataRes;
        if (summaryDataRes === "لم يُكتشف كلام في الفيديو.") finalSummary = "No summary available";
        let finalTranscript = transcriptData || "No transcript available";
        if (finalSummary && transcriptData && finalSummary.trim() === transcriptData.trim()) finalTranscript = null;
        const newTopics = response?.data?.topics || response?.topics || null;
        if (newTopics) {
          setDetail((prev) => ({
            ...prev,
            topics: {
              ...prev?.topics,
              [lang]: newTopics,
            },
          }));
        }
        setSummaryData({ summary: finalSummary || "No summary available", transcript: finalTranscript });
        setShowSummary(true);
        smartToast.success("Summary generated successfully!");
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (err) {
      smartToast.error("Failed to generate summary: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingSummary(false);
    }
  }, [session?.id, detail?.videoUrl, session?.videoUrl]);

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
  }, [session?.id, commentText, user]);

  const handleDeleteComment = useCallback(async (commentId) => {
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
  }, []);

  const handleEditCommentOpen = useCallback((comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.comment_text || comment.text || "");
  }, []);

  const handleEditCommentClose = useCallback(() => {
    setEditingCommentId(null);
    setEditCommentText("");
  }, []);

  const handleEditCommentSubmit = useCallback(async () => {
    if (!editingCommentId || !editCommentText.trim()) return;
    try {
      setEditCommentSubmitting(true);
      const updatedComment = await editCommentAPI(editingCommentId, editCommentText.trim());
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
  }, [editingCommentId, editCommentText]);

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

        // Optimistic UI
        setSaved(false);
        setDetail((prev) => ({ ...prev, savedCount: Math.max(0, (prev?.savedCount ?? 1) - 1) }));
        await deleteSavedVideo(session.id);
        invalidateSavedVideosCache();
        smartToast.success("Video removed from saved");
      } else {
        // Optimistic UI
        setSaved(true);
        setDetail((prev) => ({ ...prev, savedCount: (prev?.savedCount ?? 0) + 1 }));
        await saveVideo(session.id);
        invalidateSavedVideosCache();
        smartToast.success("Video saved successfully");
      }
    } catch (err) {
      console.error("Failed to save/unsave video", err);
      // Rollback optimistic UI
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
  }, [session?.id, onUnsave]);

  const handleEditOpen = useCallback(() => {
    setEditForm({
      title: detail?.title ?? session?.title ?? "",
      description: detail?.description ?? session?.description ?? "",
    });
    setShowEditModal(true);
  }, [detail?.title, detail?.description, session?.title, session?.description]);

  const handleEditSubmit = useCallback(async (e) => {
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
  }, [session?.id, editForm]);

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
  }, [session?.id, onVideoDeleted, onBack]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session?.id) return;
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const [data, commentsData] = await Promise.all([
          getVideoDetail(session.id),
          getVideoComments(session.id).catch(() => null)
        ]);

        if (cancelled) return;

        const v = data.video ?? {};
        const admin = data.admin ?? {};
        
        // Use comments from specialized call if successful, otherwise fallback to detail data
        const finalComments = (commentsData && Array.isArray(commentsData.comments)) 
          ? commentsData.comments 
          : (Array.isArray(data.comments) ? data.comments : []);
          
        const finalCommentCount = (commentsData && typeof commentsData.commentCount === 'number')
          ? commentsData.commentCount
          : (data.commentCount ?? finalComments.length);

        const parsedDetail = {
          title: v.title ?? session.title,
          description: data.description ?? v.description ?? session.description,
          instructor: admin.name ?? session.instructor,
          thumbnailUrl: v.poster_url ?? session.thumbnailUrl,
          videoUrl: v.video_url ?? session.videoUrl,
          likesCount: data.likes_count ?? 0,
          dislikesCount: data.dislikes_count ?? 0,
          savedCount: data.saved_count ?? 0,
          commentCount: finalCommentCount,
          topics: data.topics ?? session.topics ?? { ar: [], en: [] },
          groupName: v.group_name ?? session?.groupName ?? session?.group_name ?? null,
          group_id: v.group_id ?? session?.group_id ?? session?.groupId ?? null,
        };
        const rawSaved = data.is_saved ?? data.isSaved ?? data.saved ?? null;
        const hasUserSavedFlag = rawSaved !== null && rawSaved !== undefined;
        const normalizedSaved = (() => {
          if (rawSaved === true || rawSaved === 1) return true;
          if (rawSaved === false || rawSaved === 0) return false;
          if (rawSaved == null) return false;
          const s = String(rawSaved).toLowerCase().trim();
          if (s === "true" || s === "1" || s === "yes") return true;
          if (s === "false" || s === "0" || s === "no" || s === "") return false;
          return false;
        })();

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
        const likeId = data.like_id ?? data.user_like_id ?? data.like?.id ?? v.like_id ?? null;
        setLikeDislikeRecordId(likeId || null);
        const isLiked = data.user_like ?? data.is_liked ?? data.user_liked ?? data.liked ?? data.has_liked ?? v.user_like ?? v.is_liked ?? false;
        const isDisliked = data.user_dislike ?? data.is_disliked ?? data.user_disliked ?? data.disliked ?? data.has_disliked ?? v.user_dislike ?? v.is_disliked ?? false;
        setLiked(Boolean(isLiked));
        setDisliked(Boolean(isDisliked));

        const nested = nestComments(finalComments);
        setComments(nested);
      } catch (err) {
        if (!cancelled) setDetailError(err?.message || "Failed to load video details");
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [session?.id, user?.id, nestComments]);

  useEffect(() => {
    let cancelled = false;
    const fetchRelatedVideos = async () => {
      if (!session?.id) return;
      try {
        if (useGlobalRelated) {
          const relatedData = await getGlobalRelatedVideos(session.id);
          if (!cancelled) setRelatedVideos(Array.isArray(relatedData) ? relatedData : []);
        } else {
          const groupId = session.group_id ?? session.groupId;
          if (groupId) {
            const relatedData = await getRelatedVideos(session.id, groupId);
            if (!cancelled) setRelatedVideos(Array.isArray(relatedData) ? relatedData : []);
          } else {
            const data = await getVideoDetail(session.id);
            if (cancelled) return;
            const v = data.video ?? {};
            const fallbackGroupId = v.group_id ?? v.groupId;
            if (fallbackGroupId) {
              const relatedData = await getRelatedVideos(session.id, fallbackGroupId);
              if (!cancelled) setRelatedVideos(Array.isArray(relatedData) ? relatedData : []);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch related videos", err);
      }
    };
    fetchRelatedVideos();
    return () => { cancelled = true; };
  }, [session?.id, useGlobalRelated]);

  useEffect(() => {
    if (!socket || !session?.id) return;
    const refreshVideoDetail = async () => {
      try {
        const data = await getVideoDetail(session.id);
        const v = data.video ?? {};
        const parsed = {
          title: v.title ?? detail?.title,
          description: data.description ?? v.description ?? detail?.description,
          instructor: (data.admin?.name ?? detail?.instructor) || detail?.instructor,
          thumbnailUrl: v.poster_url ?? detail?.thumbnailUrl,
          videoUrl: v.video_url ?? detail?.videoUrl,
          likesCount: data.likes_count ?? detail?.likesCount ?? 0,
          dislikesCount: data.dislikes_count ?? detail?.dislikesCount ?? 0,
          savedCount: data.saved_count ?? detail?.savedCount ?? 0,
          commentCount: data.commentCount ?? (Array.isArray(data.comments) ? data.comments.length : detail?.commentCount ?? 0),
          topics: data.topics ?? detail?.topics ?? session?.topics ?? { ar: [], en: [] },
          groupName: v.group_name ?? detail?.groupName ?? session?.groupName ?? session?.group_name ?? null,
          group_id: v.group_id ?? detail?.group_id ?? session?.group_id ?? null,
        };
        const commentsData = await getVideoComments(session.id);
        setDetail((prev) => ({ ...prev, ...parsed, commentCount: commentsData.commentCount ?? parsed.commentCount }));
        setComments(nestComments(Array.isArray(commentsData.comments) ? commentsData.comments : []));
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
    const events = ["videoUpdated", "videoLikeUpdated", "videoDislikeUpdated", "videoSavedUpdated", "videoCommentUpdated", "videoActivity", "newNotification", "new_notification"];
    events.forEach((eventName) => socket.on(eventName, onVideoEvent));
    return () => events.forEach((eventName) => socket.off(eventName, onVideoEvent));
  }, [socket, session?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoaded = () => {
      const dur = video.duration || 0;
      setVideoDuration(dur);
      setCurrentTimeSec(video.currentTime || 0);
      setProgress(dur ? (video.currentTime / dur) * 100 : 0);
    };
    const handleTimeUpdate = () => {
      const cur = video.currentTime || 0;
      setCurrentTimeSec(cur);
      setProgress(videoDuration ? (cur / videoDuration) * 100 : 0);
    };
    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [detail?.videoUrl, session?.videoUrl, videoDuration]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatRelativeTime = useCallback(
    (isoString) => {
      if (!isoString) return "";
      let date = new Date(isoString);

      // Handle MySQL datetime string "YYYY-MM-DD HH:mm:ss" - treat as UTC
      if (typeof isoString === "string" && !isoString.includes("T") && !isoString.includes("Z")) {
        date = new Date(isoString.replace(" ", "T") + "Z");
      }

      if (Number.isNaN(date.getTime())) return "";
      let diff = Math.max(0, new Date().getTime() - date.getTime());
      const sec = Math.floor(diff / 1000);

      if (sec < 10) return "just now";
      if (sec < 60) return `${sec} seconds ago`;

      const min = Math.floor(sec / 60);
      if (min === 1) return "1 minute ago";
      if (min < 60) return `${min} minutes ago`;

      const hour = Math.floor(min / 60);
      if (hour === 1) return "1 hour ago";
      if (hour < 24) return `${hour} hours ago`;

      const day = Math.floor(hour / 24);
      if (day === 1) return "1 day ago";
      if (day < 30) return `${day} days ago`;

      const month = Math.floor(day / 30);
      if (month === 1) return "1 month ago";
      if (month < 12) return `${month} months ago`;

      const year = Math.floor(month / 12);
      if (year === 1) return "1 year ago";
      return `${year} years ago`;
    },
    [tick]
  );

  const getDaySuffix = useCallback((d) => {
    if (d >= 11 && d <= 13) return "th";
    switch (d % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  }, []);

  const formatFullDate = useCallback((dateString) => {
    if (!dateString) return "";
    let date = new Date(dateString);

    // Same MySQL fix
    if (typeof dateString === "string" && !dateString.includes("T") && !dateString.includes("Z")) {
      date = new Date(dateString.replace(" ", "T") + "Z");
    }

    if (Number.isNaN(date.getTime())) return "";

    const d = date.getDate();
    const m = date.toLocaleString("en-US", { month: "long" });
    const y = date.getFullYear();
    const suffix = getDaySuffix(d);

    return `${d}${suffix} of ${m} ${y}`;
  }, [getDaySuffix]);

  const formatTime = useCallback((seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "00:00";
    const total = Math.floor(seconds);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  const isRTL = useCallback((text) => /[\u0600-\u06FF]/.test(text), []);

  const setReplyDraft = useCallback((commentId, value) => {
    setReplyDrafts((prev) => ({ ...prev, [commentId]: value }));
  }, []);

  const toggleReplyInput = useCallback((id) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, showReplyInput: !c.showReplyInput } : c)));
  }, []);

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
    [session?.id, replyDrafts, nestComments, toggleReplyInput]
  );

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleProgressChange = useCallback((e) => {
    const value = Number(e.target.value);
    setProgress(value);
    const video = videoRef.current;
    if (!video || !videoDuration) return;
    const newTime = (value / 100) * videoDuration;
    video.currentTime = newTime;
    setCurrentTimeSec(newTime);
  }, [videoDuration]);

  const handleVolumeChange = useCallback((e) => {
    const value = Number(e.target.value);
    setVolume(value);
    const video = videoRef.current;
    if (video) video.volume = value;
  }, []);

  const videoUrl = detail?.videoUrl || session?.videoUrl || null;
  const thumbnailUrl = detail?.thumbnailUrl || session?.thumbnailUrl || null;
  const title = detail?.title ?? session?.title ?? "Data Structure Lecture 1";
  const description = detail?.description ?? session?.description ?? "";
  const topics = detail?.topics ?? session?.topics ?? { ar: [], en: [] };
  const instructor = detail?.instructor ?? session?.instructor ?? "Instructor";
  const likesCount = detail?.likesCount ?? 0;
  const dislikesCount = detail?.dislikesCount ?? 0;
  const savedCount = detail?.savedCount ?? 0;
  const commentCount = detail?.commentCount ?? comments.length;
  const groupName =
    detail?.groupName ?? session?.groupName ?? session?.group_name ?? null;
  const sourceRelated = (relatedVideos?.length > 0 ? relatedVideos : relatedSessions) || [];
  const related = sourceRelated.filter((s) => (s.id ?? s.title) !== (session?.id ?? session?.title));

  return {
    user,
    videoRef,
    progress,
    videoUrl,
    thumbnailUrl,
    title,
    description,
    topics,
    groupName,
    instructor,
    liked,
    disliked,
    dislikesCount,
    likesCount,
    saved,
    savedCount,
    commentCount,
    comments,
    commentText,
    setCommentText,
    commentSubmitting,
    replyDrafts,
    setReplyDraft,
    replySubmittingForId,
    handlePostReply,
    showSummary,
    setShowSummary,
    summaryData,
    loadingSummary,
    summaryLang,
    setSummaryLang,
    showLangDropdown,
    setShowLangDropdown,
    editForm,
    setEditForm,
    showEditModal,
    setShowEditModal,
    editSubmitting,
    showAdminMenu,
    setShowAdminMenu,
    adminMenuRef,
    deleting,
    isAdmin,
    related,
    onSelectSession,
    detailError,
    loadingDetail,
    videoDuration,
    currentTimeSec,
    volume,
    isPlaying,
    showVolumeSlider,
    setShowVolumeSlider,
    volumeControlRef,
    editingCommentId,
    editCommentText,
    setEditCommentText,
    editCommentSubmitting,
    handleEditCommentOpen,
    handleEditCommentClose,
    handleEditCommentSubmit,
    handleLikeAction,
    handleSummarize,
    handlePostComment,
    handleDeleteComment,
    handleSaveVideo,
    handleEditOpen,
    handleEditSubmit,
    handleDelete,
    handleTogglePlay,
    handleProgressChange,
    handleVolumeChange,
    formatTime,
    formatRelativeTime,
    formatFullDate,
    toggleReplyInput,
    isRTL,
  };
}
