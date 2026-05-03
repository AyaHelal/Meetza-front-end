import { useState, useRef, useEffect } from "react";
import { useSocket } from "../../../context/SocketContext";
import { useAuth } from "../../../context/AuthContext";
import { useMinuteTick } from "./useMinuteTick";
import { useVideoSessionDetailPlayback } from "./useVideoSessionDetailPlayback";
import { useVideoSessionDetailSyncEffects } from "./useVideoSessionDetailSyncEffects";
import { useVideoSessionDetailInteractions } from "./useVideoSessionDetailInteractions";

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
  useMinuteTick();

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [, setLikeDislikeRecordId] = useState(null);
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
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef(null);

  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const {
    videoRef,
    progress,
    resumeAppliedRef,
    hasPlaybackStartedRef,
    videoDuration,
    currentTimeSec,
    volume,
    isPlaying,
    showVolumeSlider,
    setShowVolumeSlider,
    volumeControlRef,
    handleTogglePlay,
    handleProgressChange,
    handleVolumeChange,
  } = useVideoSessionDetailPlayback({ session, detail, setDetail });

  useVideoSessionDetailSyncEffects({
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
  });

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
      if (showVolumeSlider && volumeControlRef.current && !volumeControlRef.current.contains(event.target)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLangDropdown, showAdminMenu, showVolumeSlider, volumeControlRef, setShowVolumeSlider]);

  useEffect(() => {
    setShowSummary(false);
    setSummaryData(null);
    setSummaryLang("en");
    setShowLangDropdown(false);
    setLoadingSummary(false);
    setShowAdminMenu(false);
    setLikeDislikeRecordId(null);
    resumeAppliedRef.current = false;
    hasPlaybackStartedRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs stable; align with original [session?.id] only
  }, [session?.id]);

  const {
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
    toggleRepliesVisibility,
    handlePostReply,
  } = useVideoSessionDetailInteractions({
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
    setLikeSubmitting,
    setSaveSubmitting,
  });

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
  const watchProgressSeconds = detail?.watchProgressSeconds ?? 0;
  const groupName = detail?.groupName ?? session?.groupName ?? session?.group_name ?? null;
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
    watchProgressSeconds,
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
    toggleRepliesVisibility,
    isRTL,
    likeSubmitting,
    saveSubmitting,
  };
}
