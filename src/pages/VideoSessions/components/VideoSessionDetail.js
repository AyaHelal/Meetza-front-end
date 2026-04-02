import React from "react";
import {
  ThumbsUp,
  ThumbsDown,
  BookmarkSimple,
  LinkSimple,
  UserCircle,
  Trash,
  PencilSimple,
  DotsThreeVertical,
  Play as PlayIcon,
  Pause as PauseIcon,
  SpeakerSimpleLow as SpeakerSimpleLowIcon,
  PaperPlaneRight as PaperPlaneRightIcon,
  Spinner,
  Download,
} from "@phosphor-icons/react";
import Lottie from "lottie-react";
import aiAnimation from "../../../lottie/AI.json";
import "./VideoSessionDetail.css";
import { useVideoSessionDetail } from "../hooks/useVideoSessionDetail";
import { downloadVideo } from "../../../utils/videoUtils";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";

const VolumeIcon = (props) => <SpeakerSimpleLowIcon size={18} weight="regular" {...props} />;

const DEFAULT_THUMB =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";
const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23e5e7eb'/%3E%3C/svg%3E";

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
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);
  const commentsSectionRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const [showVideoDeleteModal, setShowVideoDeleteModal] = React.useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = React.useState(null);

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

  if (!session) return null;

  const rawSlug = (session?.slug ?? session?.title ?? "").toString();
  const shareSlug = encodeURIComponent(rawSlug.trim());
  const sharePath = `/video/${shareSlug}`;
  const shareUrl = `${window.location.origin}${sharePath}`;

  const {
    user,
    videoRef,
    progress,
    videoUrl,
    thumbnailUrl,
    title,
    description,
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
    showSummary,
    setShowSummary,
    summaryData,
    loadingSummary,
    summaryLang,
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
    related,
    topics,
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
    handlePostReply,
    handleDeleteComment,
    replyDrafts,
    setReplyDraft,
    replySubmittingForId,
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
  } = api;



  const handleDownloadClick = () => {
    downloadVideo(
      session?.video_url || session?.videoUrl,
      title,
      () => setDownloading(true),
      () => setDownloading(false),
      () => {
        setDownloading(false);
        alert("Failed to download video. Please try again.");
      }
    );
  };

  const handleCopyShare = async (e) => {
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
      window.clearTimeout(handleCopyShare._t);
      handleCopyShare._t = window.setTimeout(() => setShareCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const thumbUrl = thumbnailUrl || DEFAULT_THUMB;

  return (
    <div className="video-session-detail">
      {/* ── MAIN ── */}
      <div className="video-session-detail-inner">
        <div className="video-session-detail-main">
          {/* Player */}
          <div className="video-session-detail-player-wrap">
            {videoUrl ? (
              <video
                ref={videoRef}
                className="video-session-detail-player"
                src={videoUrl}
                poster={thumbUrl}
                controls={false}
              />
            ) : (
              <div className="video-session-detail-player-placeholder">
                <img src={thumbUrl} alt="" />
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
                <div className="video-ctrl-volume" ref={volumeControlRef}>
                  <button
                    type="button"
                    className="video-ctrl-btn video-ctrl-volume-btn"
                    onClick={() => setShowVolumeSlider((prev) => !prev)}
                    aria-label={showVolumeSlider ? "Hide volume" : "Volume"}
                    aria-expanded={showVolumeSlider}
                  >
                    <VolumeIcon />
                  </button>
                  {showVolumeSlider && (
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={handleVolumeChange}
                      className="video-volume-slider"
                      aria-label="Volume level"
                    />
                  )}
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
                  className={`video-session-detail-btn video-session-detail-btn-icon-only ${liked ? "active" : ""}`}
                  onClick={() => handleLikeAction(1)}
                  title={`Like${likesCount ? ` (${likesCount})` : ""}`}
                  aria-label={`Like${likesCount ? ` (${likesCount})` : ""}`}
                >
                  <ThumbsUp size={16} weight={liked ? "fill" : "regular"} />
                  <span className="video-session-detail-btn-label">Like {likesCount ? `(${likesCount})` : ""}</span>
                  <span className="video-session-detail-btn-count" aria-hidden="true">{likesCount ?? 0}</span>
                </button>
                <button
                  type="button"
                  className={`video-session-detail-btn video-session-detail-btn-icon-only ${disliked ? "active" : ""}`}
                  onClick={() => handleLikeAction(0)}
                  title={`Dislike${dislikesCount ? ` (${dislikesCount})` : ""}`}
                  aria-label={`Dislike${dislikesCount ? ` (${dislikesCount})` : ""}`}
                >
                  <ThumbsDown size={16} weight={disliked ? "fill" : "regular"} />
                  <span className="video-session-detail-btn-label">Dislike {dislikesCount ? `(${dislikesCount})` : ""}</span>
                  <span className="video-session-detail-btn-count" aria-hidden="true">{dislikesCount ?? 0}</span>
                </button>
                <div className="summary-container">
                  <button
                    type="button"
                    className={`video-session-detail-btn ${loadingSummary ? "loading" : ""}`}
                    onClick={() => !loadingSummary && setShowLangDropdown(!showLangDropdown)}
                    disabled={loadingSummary}
                  >
                    {loadingSummary ? (
                      <Spinner size={16} className="spinning" />
                    ) : (
                      <Lottie animationData={aiAnimation} style={{ width: 20, height: 20 }} />
                    )}
                    <span>{loadingSummary ? "Summarizing..." : "Summary"}</span>
                  </button>
                  {showLangDropdown && (
                    <div className="language-options" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="language-option"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSummarize("en");
                        }}
                        disabled={loadingSummary}
                      >
                        English
                      </button>
                      <button
                        className="language-option"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSummarize("ar");
                        }}
                        disabled={loadingSummary}
                      >
                        Arabic
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`video-session-detail-btn video-session-detail-btn-icon-only ${saved ? "active" : ""}`}
                  onClick={handleSaveVideo}
                  title={`Save${savedCount ? ` (${savedCount})` : ""}`}
                  aria-label={`Save${savedCount ? ` (${savedCount})` : ""}`}
                >
                  <BookmarkSimple size={16} weight={saved ? "fill" : "regular"} />
                  <span className="video-session-detail-btn-label">Save {savedCount ? `(${savedCount})` : ""}</span>
                </button>

                <div className="video-session-detail-share-wrap">
                  <button
                    type="button"
                    className="video-session-detail-btn video-session-detail-btn-icon-only"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareOpen((prev) => !prev);
                    }}
                    title="Share"
                    aria-label="Share"
                    aria-expanded={shareOpen}
                    aria-haspopup="true"
                  >
                    <LinkSimple size={16} weight="regular" />
                    <span className="video-session-detail-btn-label">Share</span>
                  </button>

                  {shareOpen && (
                    <div
                      className="video-session-detail-share-popover"
                      onClick={(e) => e.stopPropagation()}
                      role="dialog"
                      aria-label="Share link"
                    >
                      <a className="video-session-detail-share-link" href={sharePath}>
                        {shareUrl}
                      </a>
                      <button type="button" className="video-session-detail-share-copy" onClick={handleCopyShare}>
                        {shareCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className={`video-session-detail-btn vsd-download-btn ${downloading ? "loading" : ""}`}
                  onClick={handleDownloadClick}
                  disabled={downloading}
                  title="Download Video"
                >
                  {downloading ? (
                    <Spinner size={16} className="spinning" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>{downloading ? "Downloading..." : "Download"}</span>
                </button>

                {isAdmin && (
                  <div className="video-session-detail-admin-menu-wrap" ref={adminMenuRef}>
                    <button
                      type="button"
                      className="video-session-detail-btn video-session-detail-btn-dots"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdminMenu((prev) => !prev);
                      }}
                      title="More options"
                      aria-label="More options"
                      aria-expanded={showAdminMenu}
                      aria-haspopup="true"
                    >
                      <DotsThreeVertical size={20} weight="bold" />
                    </button>
                    {showAdminMenu && (
                      <div className="video-session-detail-admin-dropdown" role="menu">
                        <button
                          type="button"
                          className="video-session-detail-admin-dropdown-item"
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAdminMenu(false);
                            handleEditOpen();
                          }}
                        >
                          <PencilSimple size={18} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="video-session-detail-admin-dropdown-item video-session-detail-admin-dropdown-item-danger"
                          role="menuitem"
                          disabled={deleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAdminMenu(false);
                            setShowVideoDeleteModal(true);
                          }}
                        >
                          {deleting ? <Spinner size={18} className="spinning" /> : <Trash size={18} />}
                          <span>{deleting ? "Deleting…" : "Delete"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <section className="video-session-detail-description">
              <h3>Video Description</h3>
              <p>{description ? description : "No description available."}</p>
              {instructor && <p className="video-session-detail-instructor">Instructor: {instructor}</p>}
            </section>

            {/* Topics */}
            {(() => {
              if (!topics) return null;

              const getValidTopicsList = (val) => {
                if (Array.isArray(val)) return val.length > 0 ? val : [];
                if (typeof val === "string" && val.trim() !== "" && val.toLowerCase() !== "null") {
                  return val.split(",").map((t) => t.trim()).filter(Boolean);
                }
                return [];
              };

              // Merge all available topics (English, Arabic, and any generic topics)
              const arTopics = getValidTopicsList(topics.ar);
              const enTopics = getValidTopicsList(topics.en);
              const rawTopics = getValidTopicsList(topics);
              
              const allTopics = [...new Set([...enTopics, ...arTopics, ...rawTopics])];

              if (allTopics.length === 0) return null;

              return (
                <section className="vsd-topics-section">
                  <h3>Topics</h3>
                  <div className="vsd-topics-container">
                    {allTopics.map((topic, index) => (
                      <span key={index} className="vsd-topic-badge">
                        {topic}
                      </span>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Comments */}
            <section className="video-session-detail-questions" ref={commentsSectionRef}>
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
                          <p className={`vsd-comment-text ${isRTL(commentBody) ? "" : "ltr"}`}>{commentBody}</p>
                          <button className="vsd-comment-reply-btn" onClick={() => toggleReplyInput(c.id)}>
                            Reply
                          </button>
                          {(c.replies || []).map((r) => {
                            const replyAuthor = r.member_name || r.author || r.user_name || r.name || "Anonymous";
                            const replyBody = r.comment_text || r.comment || r.text || "";
                            const replyTime = r.timestamp || r.time || r.created_at || r.createdAt || "";
                            return (
                              <div key={r.id} className="vsd-reply">
                                {(r.Member_photo || r.member_photo || r.avatar) ? (
                                  <img
                                    className="vsd-reply-avatar vsd-reply-avatar-img"
                                    src={r.Member_photo || r.member_photo || r.avatar}
                                    alt={replyAuthor}
                                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                                  />
                                ) : (
                                  <div className="vsd-reply-avatar vsd-reply-avatar-initial">
                                    {replyAuthor.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="vsd-reply-body">
                                  <span className="vsd-reply-author">{replyAuthor}</span>
                                  <span className="vsd-reply-time">{formatRelativeTime(replyTime) || replyTime || "Just now"}</span>
                                  <p className={`vsd-reply-text ${isRTL(replyBody) ? "" : "ltr"}`}>{replyBody}</p>
                                </div>
                              </div>
                            );
                          })}
                          {c.showReplyInput && (
                            <div className="vsd-nested-input">
                              {(() => {
                                const currentUserName = user?.name || user?.member_name || user?.memberName || user?.email || "You";
                                const currentUserAvatar =
                                  user?.photo ||
                                  user?.user_photo ||
                                  user?.Member_photo ||
                                  user?.member_photo ||
                                  user?.avatar ||
                                  user?.image ||
                                  user?.picture ||
                                  null;

                                if (currentUserAvatar) {
                                  return (
                                    <img
                                      className="vsd-comment-avatar"
                                      src={currentUserAvatar}
                                      alt={currentUserName}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = DEFAULT_AVATAR;
                                      }}
                                    />
                                  );
                                }

                                return (
                                  <div className="vsd-comment-avatar vsd-comment-avatar-initial">
                                    {currentUserName.charAt(0).toUpperCase()}
                                  </div>
                                );
                              })()}
                              <input
                                className="vsd-nested-field"
                                placeholder="Write a reply..."
                                value={replyDrafts[c.id] ?? ""}
                                onChange={(e) => setReplyDraft(c.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !replySubmittingForId && (replyDrafts[c.id] ?? "").trim()) {
                                    e.preventDefault();
                                    handlePostReply(c.id);
                                  }
                                }}
                                disabled={replySubmittingForId === c.id}
                              />
                              <button
                                type="button"
                                className="video-session-detail-comment-btn vsd-reply-submit"
                                onClick={() => handlePostReply(c.id)}
                                disabled={replySubmittingForId === c.id || !(replyDrafts[c.id] ?? "").trim()}
                                aria-label="Post reply"
                              >
                                {replySubmittingForId === c.id ? "Posting..." : <PaperPlaneRightIcon size={20} />}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="vsd-comment-actions">
                          {(user?.role === "Administrator" ||
                            user?.role === "Super_Admin" ||
                            user?.id === c.member_id ||
                            user?.id === c.memberId) && (
                              <>
                                <button
                                  className="vsd-edit-btn"
                                  onClick={() => handleEditCommentOpen(c)}
                                  title="Edit"
                                >
                                  <PencilSimple size={18} />
                                </button>
                                <button className="vsd-delete-btn" onClick={() => setCommentToDeleteId(c.id)} title="Delete">
                                  <Trash size={18} />
                                </button>
                              </>
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

        {/* ── SIDEBAR (right) ── */}
        <aside className="video-session-detail-related">
          <div className="video-session-detail-related-list">
            {related.length === 0 ? (
              <p className="video-session-detail-related-empty">No other videos</p>
            ) : (
              related.slice(0, 8).map((s) => (
                <div
                  key={s.id ?? s.title}
                  className="video-session-detail-related-item box-shadow-none "
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

      {/* AI Summary Section */}
      {showSummary && summaryData && (
        <div className="video-ai-summary">
          <div className="video-ai-summary-header">
            <div className="video-ai-summary-icon">
              <Lottie animationData={aiAnimation} style={{ width: 30, height: 30 }} />
              <span>AI Summary</span>
            </div>
            <button
              type="button"
              className="video-ai-summary-close"
              onClick={() => setShowSummary(false)}
              aria-label="Close AI Summary"
            >
              ✕
            </button>
          </div>
          <div className="video-ai-summary-content">
            {summaryData.transcript && (
              <div className="video-ai-summary-transcript">
                <h4>Transcript</h4>
                <p>{summaryData.transcript}</p>
              </div>
            )}
            <div className="video-ai-summary-summary">
              <h4>Summary</h4>
              <p>{summaryData.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal (admin) */}
      {showEditModal && (
        <div
          className="video-edit-modal-overlay"
          onClick={() => !editSubmitting && setShowEditModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-video-title"
        >
          <div className="video-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-edit-modal-header">
              <h3 id="edit-video-title">Edit video</h3>
              <button
                type="button"
                className="video-edit-modal-close"
                onClick={() => !editSubmitting && setShowEditModal(false)}
                aria-label="Close"
                disabled={editSubmitting}
              >
                ×
              </button>
            </div>
            <form className="video-edit-modal-form" onSubmit={handleEditSubmit}>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-title-input">Title</label>
                <input
                  id="edit-video-title-input"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Video title"
                  required
                />
              </div>
              <div className="video-edit-form-group">
                <label htmlFor="edit-video-description">Description</label>
                <textarea
                  id="edit-video-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Video description"
                  rows={3}
                />
              </div>
              <div className="video-edit-modal-actions">
                <button
                  type="button"
                  className="video-edit-btn video-edit-btn-cancel"
                  onClick={() => setShowEditModal(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="video-edit-btn video-edit-btn-submit" disabled={editSubmitting}>
                  {editSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Comment Modal */}
      {editingCommentId && (
        <div
          className="video-edit-modal-overlay"
          onClick={() => !editCommentSubmitting && handleEditCommentClose()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-comment-title"
        >
          <div className="video-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-edit-modal-header">
              <h3 id="edit-comment-title">Edit comment</h3>
              <button
                type="button"
                className="video-edit-modal-close"
                onClick={() => !editCommentSubmitting && handleEditCommentClose()}
                aria-label="Close"
                disabled={editCommentSubmitting}
              >
                ×
              </button>
            </div>
            <form
              className="video-edit-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleEditCommentSubmit();
              }}
            >
              <div className="video-edit-form-group">
                <label htmlFor="edit-comment-text">Comment</label>
                <textarea
                  id="edit-comment-text"
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  placeholder="Edit your comment"
                  rows={3}
                  required
                />
              </div>
              <div className="video-edit-modal-actions">
                <button
                  type="button"
                  className="video-edit-btn video-edit-btn-cancel"
                  onClick={handleEditCommentClose}
                  disabled={editCommentSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="video-edit-btn video-edit-btn-submit"
                  disabled={editCommentSubmitting}
                >
                  {editCommentSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modals */}
      <RenderModals
        showVideoDeleteModal={showVideoDeleteModal}
        setShowVideoDeleteModal={setShowVideoDeleteModal}
        onConfirmVideoDelete={handleDelete}
        deletingVideo={deleting}
        commentToDeleteId={commentToDeleteId}
        setCommentToDeleteId={setCommentToDeleteId}
        onConfirmCommentDelete={handleDeleteComment}
      />
    </div>
  );
}


/* Final Cleanup: Placing modals at the bottom of the component structure */

const RenderModals = ({
  showVideoDeleteModal,
  setShowVideoDeleteModal,
  onConfirmVideoDelete,
  deletingVideo,
  commentToDeleteId,
  setCommentToDeleteId,
  onConfirmCommentDelete,
}) => (
  <>
    {/* Delete Video Modal */}
    <ConfirmDeleteModal
      show={showVideoDeleteModal}
      onClose={() => setShowVideoDeleteModal(false)}
      onConfirm={async () => {
        await onConfirmVideoDelete();
        setShowVideoDeleteModal(false);
      }}
      title="Delete Video"
      message="Are you sure you want to delete this video? This cannot be undone."
      confirming={deletingVideo}
      confirmLabel="Delete"
    />

    {/* Delete Comment Modal */}
    <ConfirmDeleteModal
      show={!!commentToDeleteId}
      onClose={() => setCommentToDeleteId(null)}
      onConfirm={async () => {
        if (commentToDeleteId) {
          await onConfirmCommentDelete(commentToDeleteId);
          setCommentToDeleteId(null);
        }
      }}
      title="Delete Comment"
      message="Are you sure you want to delete this comment?"
      confirmLabel="Delete"
    />
  </>
);
