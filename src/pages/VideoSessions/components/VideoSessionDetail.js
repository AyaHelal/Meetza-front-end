import React, { useState, useRef, useEffect } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  BookmarkSimple,
  UserCircle,
  Sparkle,
  Trash,
  Play as PlayIcon,
  Pause as PauseIcon,
  SpeakerSimpleLow as SpeakerSimpleLowIcon,
  PaperPlaneRight as PaperPlaneRightIcon,
} from "@phosphor-icons/react";
import "./VideoSessionDetail.css";
import { getVideoDetail, createLike, saveVideo, getRelatedVideos, getGlobalRelatedVideos, createComment, getVideoComments, deleteComment as deleteCommentAPI } from "../services";
import { useSocket } from "../../../context/SocketContext";
import { useAuth } from "../../../context/AuthContext";
import { smartToast } from "../../../API/toastManager";

const VolumeIcon = (props) => <SpeakerSimpleLowIcon size={18} {...props} />;

const DEFAULT_THUMB =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";
const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23e5e7eb'/%3E%3C/svg%3E";

export default function VideoSessionDetail({ session, relatedSessions, onBack, onSelectSession, useGlobalRelated = false }) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);

  const { socket } = useSocket();
  const { user } = useAuth();

  const handleLikeAction = async (likeType) => {
    if (!session?.id) return;
    try {
      const result = await createLike(session.id, likeType);
      const responseData = result?.data;

      if (responseData) {
        const likesCount = responseData.likes_count ?? detail?.likesCount ?? 0;
        const dislikesCount = responseData.dislikes_count ?? detail?.dislikesCount ?? 0;
        setDetail((prev) => ({
          ...prev,
          likesCount,
          dislikesCount,
        }));
      }

      if (likeType === 1) {
        setLiked((prev) => !prev);
        setDisliked(false);
      } else {
        setDisliked((prev) => !prev);
        setLiked(false);
      }
    } catch (err) {
      console.error("Failed to submit like/dislike", err);
      // Here you may set user-facing error state if desired.
    }
  };

  const handlePostComment = async () => {
    if (!session?.id || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const postResult = await createComment(session.id, commentText.trim());
      setCommentText("");
      const addedComment = postResult?.data ?? postResult?.comment ?? postResult;
      if (addedComment) {
        const now = new Date().toISOString();
        const safeComment = {
          ...addedComment,
          timestamp: addedComment.timestamp || addedComment.created_at || addedComment.createdAt || now,
        };
        setComments((prev) => [...prev, safeComment]);
        setDetail((prev) => ({
          ...prev,
          commentCount: (prev?.commentCount ?? 0) + 1,
        }));
      } else {
        const latest = await getVideoComments(session.id);
        setComments(latest.comments);
        setDetail((prev) => ({
          ...prev,
          commentCount: latest.commentCount ?? prev?.commentCount ?? 0,
        }));
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;
    try {
      await deleteCommentAPI(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setDetail((prev) => ({
        ...prev,
        commentCount: Math.max((prev?.commentCount ?? 1) - 1, 0),
      }));
      smartToast.success("Comment deleted");
    } catch (err) {
      console.error("Failed to delete comment", err);
      smartToast.error("Failed to delete comment. Please try again.");
    }
  };

  const handleSaveVideo = async () => {
    if (!session?.id) return;
    try {
      await saveVideo(session.id);
      setSaved(true);
      smartToast.success("Video saved successfully");
    } catch (err) {
      console.error("Failed to save video", err);
      smartToast.error("Failed to save video. Please try again.");
    }
  };

  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const [detail, setDetail] = useState(null);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    let diff = now.getTime() - date.getTime();
    if (diff < 0) diff = 0;

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
  };
  const [detailError, setDetailError] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session?.id) return;
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const data = await getVideoDetail(session.id);
        if (cancelled) return;
        const v = data.video ?? {};
        const admin = data.admin ?? {};

        const parsedDetail = {
          title: v.title ?? session.title,
          description: data.description ?? v.description ?? session.description,
          instructor: admin.name ?? session.instructor,
          thumbnailUrl: v.poster_url ?? session.thumbnailUrl,
          videoUrl: v.video_url ?? session.videoUrl,
          likesCount: data.likes_count ?? 0,
          dislikesCount: data.dislikes_count ?? 0,
          savedCount: data.saved_count ?? 0,
          commentCount: data.commentCount ?? (Array.isArray(data.comments) ? data.comments.length : 0),
        };
        setSaved(Boolean(data.is_saved ?? data.saved ?? data.saved_count > 0));
        setDetail(parsedDetail);

        const commentsData = await getVideoComments(session.id);
        if (cancelled) return;
        setComments(Array.isArray(commentsData.comments) ? commentsData.comments : []);
        setDetail((prev) => ({
          ...prev,
          commentCount: commentsData.commentCount ?? parsedDetail.commentCount,
        }));

        // Related videos are now fetched separately
      } catch (err) {
        if (!cancelled) {
          setDetailError(err?.message || "Failed to load video details");
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  // Separate useEffect for fetching related videos only once
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
            // Fallback: fetch video detail to get groupId
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
    return () => {
      cancelled = true;
    };
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
        };

        const commentsData = await getVideoComments(session.id);

        setDetail((prev) => ({
          ...prev,
          ...parsed,
          commentCount: commentsData.commentCount ?? parsed.commentCount,
        }));
        setComments(Array.isArray(commentsData.comments) ? commentsData.comments : []);
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

    return () => {
      events.forEach((eventName) => socket.off(eventName, onVideoEvent));
    };
  }, [socket, session]);

  const videoUrl = detail?.videoUrl || session.videoUrl || null;
  const thumbnailUrl = detail?.thumbnailUrl || session.thumbnailUrl || DEFAULT_THUMB;
  const title = detail?.title ?? session.title ?? "Data Structure Lecture 1";
  const description = detail?.description ?? session.description ?? "";
  const instructor = detail?.instructor ?? session.instructor ?? "Instructor";
  const likesCount = detail?.likesCount ?? 0;
  const dislikesCount = detail?.dislikesCount ?? 0;
  const savedCount = detail?.savedCount ?? 0;
  const commentCount = detail?.commentCount ?? comments.length;

  const sourceRelated = (relatedVideos && relatedVideos.length > 0) ? relatedVideos : (relatedSessions || []);
  const related = sourceRelated.filter((s) => (s.id ?? s.title) !== (session.id ?? session.title));

  const toggleReplyInput = (id) =>
    setComments((prev) =>
      prev.map((c) => c.id === id ? { ...c, showReplyInput: !c.showReplyInput } : c)
    );

  const deleteComment = (id) =>
    setComments((prev) => prev.filter((c) => c.id !== id));

  const isRTL = (text) => /[\u0600-\u06FF]/.test(text);

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "00:00";
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getDaySuffix = (d) => {
    if (d >= 11 && d <= 13) return "th";
    switch (d % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    const day = date.getUTCDate();
    const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
    const year = date.getUTCFullYear();

    return `${day}${getDaySuffix(day)} of ${month} ${year}`;
  };

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
  }, [videoUrl, videoDuration]);

  if (!session) return null;

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleProgressChange = (e) => {
    const value = Number(e.target.value);
    setProgress(value);
    const video = videoRef.current;
    if (!video || !videoDuration) return;
    const newTime = (value / 100) * videoDuration;
    video.currentTime = newTime;
    setCurrentTimeSec(newTime);
  };

  const handleVolumeChange = (e) => {
    const value = Number(e.target.value);
    setVolume(value);
    const video = videoRef.current;
    if (video) {
      video.volume = value;
    }
  };

  return (
    <div className="video-session-detail">
      {/* ── MAIN ── */}
      <div className="video-session-detail-main">

        {/* Player */}
        <div className="video-session-detail-player-wrap">
          {videoUrl ? (
            <video
              ref={videoRef}
              className="video-session-detail-player"
              src={videoUrl}
              poster={thumbnailUrl}
              controls={false}
            />
          ) : (
            <div className="video-session-detail-player-placeholder">
              <img src={thumbnailUrl} alt="" />
            </div>
          )}
          <div className="video-session-detail-controls">
            <input
              type="range"
              className="video-session-detail-progress"
              min={0}
              max={100}
              value={progress}
              onChange={handleProgressChange}
              style={{ "--progress": `${progress}%` }}
            />
            <div className="video-session-detail-controls-row">
              <button className="video-ctrl-btn" type="button" onClick={handleTogglePlay}>
                {isPlaying ? <PauseIcon size={32} /> : <PlayIcon size={32} />}
              </button>
              <div className="video-ctrl-volume">
                <VolumeIcon />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="video-volume-slider"
                />
              </div>
              <span className="video-time">
                {formatTime(currentTimeSec)} / {formatTime(videoDuration)}
              </span>
            </div>
          </div>
        </div>

        {/* Content below player */}
        <div className="video-session-detail-content">

          {/* Title + actions */}
          <div className="video-session-detail-title-row">
            <h2 className="video-session-detail-title">{title}</h2>
            <div className="video-session-detail-actions">
              <button
                type="button"
                className={`video-session-detail-btn ${liked ? "active" : ""}`}
                onClick={() => handleLikeAction(1)}
              >
                <ThumbsUp size={16} weight={liked ? "fill" : "regular"} />
                <span>Like {likesCount ? `(${likesCount})` : ""}</span>
              </button>
              <button
                type="button"
                className={`video-session-detail-btn ${disliked ? "active" : ""}`}
                onClick={() => handleLikeAction(0)}
              >
                <ThumbsDown size={16} weight={disliked ? "fill" : "regular"} />
                <span>Dislike {dislikesCount ? `(${dislikesCount})` : ""}</span>
              </button>
              <button type="button" className="video-session-detail-btn">
                <Sparkle size={16} />
                <span>Ask</span>
              </button>
              <button
                type="button"
                className={`video-session-detail-btn ${saved ? "active" : ""}`}
                onClick={handleSaveVideo}
              >
                <BookmarkSimple size={16} weight={saved ? "fill" : "regular"} />
                <span>Save {savedCount ? `(${savedCount})` : ""}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <section className="video-session-detail-description">
            <h3>Video Description</h3>
            <p>{description ? description : "No description available."}</p>
            {instructor && <p className="video-session-detail-instructor">Instructor: {instructor}</p>}
          </section>

          {/* Comments */}
          <section className="video-session-detail-questions">
            <h3>Student Questions {commentCount ? `(${commentCount})` : ""}</h3>

            <div className="video-session-detail-comment-input">
              {(user?.Member_photo || user?.member_photo || user?.photo || user?.avatar) ? (
                <img
                  src={user?.Member_photo || user?.member_photo || user?.photo || user?.avatar}
                  alt={user?.name || user?.member_name || "Me"}
                  className="video-session-detail-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_AVATAR;
                  }}
                />
              ) : (
                <div className="video-session-detail-avatar video-session-detail-avatar-initial">
                  {(user?.name || user?.member_name || "M").charAt(0).toUpperCase()}
                </div>
              )}
              <input
                type="text"
                placeholder="Add a comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !commentSubmitting && commentText.trim()) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
                className="video-session-detail-comment-field"
              />
              <button
                type="button"
                className="video-session-detail-comment-btn"
                onClick={handlePostComment}
                disabled={commentSubmitting || !commentText.trim()}
                aria-label="post comment"
              >
                {commentSubmitting ? "Posting..." : <PaperPlaneRightIcon size={22} />}
              </button>
            </div>

            <div className="video-session-detail-comments-list">
              {comments.length === 0 ? (
                <p className="video-session-detail-comments-empty">No comments yet. Be the first to ask.</p>
              ) : (
                comments.map((c) => {
                  const authorName = c.member_name || c.author || c.user_name || c.name || "Anonymous";
                  const avatarUrl = c.Member_photo || c.member_photo || c.avatar || c.user_avatar;
                  const commentBody = c.comment_text || c.comment || c.text || "";
                  const createdAt = c.timestamp || c.time || c.created_at || c.createdAt || "";

                  return (
                    <div key={c.id} className="vsd-comment">
                      {avatarUrl ? (
                        <img
                          className="vsd-comment-avatar"
                          src={avatarUrl}
                          alt={authorName}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_AVATAR;
                          }}
                        />
                      ) : (
                        <div className="vsd-comment-avatar vsd-comment-avatar-initial">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="vsd-comment-body">
                        <div className="vsd-comment-header">
                          <span className="vsd-comment-author">{authorName}</span>
                          <span className="vsd-comment-time">{formatRelativeTime(createdAt) || "Just now"}</span>
                        </div>
                        <p className={`vsd-comment-text ${isRTL(commentBody) ? "" : "ltr"}`}>
                          {commentBody}
                        </p>
                        <button className="vsd-comment-reply-btn" onClick={() => toggleReplyInput(c.id)}>
                          Reply
                        </button>

                      {(c.replies || []).map((r) => (
                        <div key={r.id} className="vsd-reply">
                          <UserCircle size={22} className="vsd-reply-avatar" />
                          <div className="vsd-reply-body">
                            <span className="vsd-reply-author">{r.author}</span>
                            <span className="vsd-reply-time">{r.time}</span>
                            <p className="vsd-reply-text">{r.text}</p>
                          </div>
                        </div>
                      ))}

                      {c.showReplyInput && (
                        <div className="vsd-nested-input">
                          <UserCircle size={22} className="vsd-comment-avatar" />
                          <input className="vsd-nested-field" placeholder="Add a comment" />
                        </div>
                      )}
                    </div>
                    <div className="vsd-comment-actions">
                      {(user?.role === "Administrator" || user?.role === "Super_Admin" || user?.id === c.member_id || user?.id === c.memberId) && (
                        <button className="vsd-delete-btn" onClick={() => handleDeleteComment(c.id)} title="Delete">
                          <Trash size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </section>

        </div>
      </div>

      {/* ── SIDEBAR ── */}
      <aside className="video-session-detail-related">
        <h3 className="video-session-detail-related-title">Related videos</h3>
        <div className="video-session-detail-related-list">
          {related.length === 0 ? (
            <p className="video-session-detail-related-empty">No other videos</p>
          ) : (
            related.slice(0, 8).map((s) => (
              <div
                key={s.id ?? s.title}
                className="video-session-detail-related-item"
                onClick={() => onSelectSession?.(s)}
                onKeyDown={(e) => e.key === "Enter" && onSelectSession?.(s)}
                role="button"
                tabIndex={0}
              >
                <div className="video-session-detail-related-thumb">
                  <img src={s.poster_url || s.thumbnailUrl || DEFAULT_THUMB} alt={s.title || "Related Video"} />
                  <span className="video-session-detail-related-duration">{s.duration ?? "00:00"}</span>
                </div>
                <div className="video-session-detail-related-info">
                  <span className="video-session-detail-related-item-title">{s.title ?? "Video"}</span>
                  {(s.admin?.name || s.group_name || instructor) && (
                    <span className="video-session-detail-related-instructor">
                      {s.admin?.name || s.group_name || instructor}
                    </span>
                  )}
                  {(s.created_at || s.createdAt) && (
                    <span className="video-session-detail-related-date">
                      {formatFullDate(s.created_at || s.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}