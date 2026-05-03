import React from "react";
import {
  ThumbsUp,
  ThumbsDown,
  BookmarkSimple,
  LinkSimple,
  Trash,
  PencilSimple,
  DotsThreeVertical,
  Play as PlayIcon,
  Pause as PauseIcon,
  SpeakerSimpleLow as SpeakerSimpleLowIcon,
  Spinner,
  Download,
} from "@phosphor-icons/react";
import Lottie from "lottie-react";
import aiAnimation from "../../../lottie/AI.json";
import "./VideoSessionDetail.css";
import { VideoHoverPreviewThumb } from "./VideoHoverPreviewThumb";
import { mergeTopicLists } from "../services/videoSessionTopicsUtils";
import { VideoSessionDetailConfirmModals } from "./VideoSessionDetailModals";
import { VsdCommentsSection } from "./VsdCommentsSection";
import { VsdVideoEditModals } from "./VsdVideoEditModals";

const VolumeIcon = (props) => <SpeakerSimpleLowIcon size={18} weight="regular" {...props} />;

export function VideoSessionDetailLayout(props) {
  const {
    user,
    videoRef,
    progress,
    videoUrl,
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
    toggleRepliesVisibility,
    isRTL,
    shareOpen,
    setShareOpen,
    shareCopied,
    commentsSectionRef,
    downloading,
    likeSubmitting,
    saveSubmitting,
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
    onSelectSession,
    isAdmin,
  } = props;

  const topicList = topics
    ? mergeTopicLists(topics).filter((t) => typeof t === "string" && t.trim() !== "")
    : [];

  return (
    <div className="video-session-detail">
      <div className="video-session-detail-inner">
        <div className="video-session-detail-main">
          {/* ── Player ── */}
          <div className="video-session-detail-player-wrap">
            {videoUrl ? (
              <video
                ref={videoRef}
                className="video-session-detail-player"
                src={videoUrl}
                poster={thumbUrl || undefined}
                controls={false}
              />
            ) : (
              <div className="video-session-detail-player-placeholder">
                <img src={thumbUrl || "/assets/video-standard.png"} alt="" />
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

          {/* ── Content below player ── */}
          <div className="video-session-detail-content">
            {/* Title + Actions */}
            <div className="video-session-detail-title-row">
              <div className="video-session-detail-title-stack">
                <h2 className="video-session-detail-title">{title}</h2>
                {!!groupLabel && (
                  <p className="video-session-detail-group" title={`Group: ${groupLabel}`}>
                    {groupLabel}
                  </p>
                )}
              </div>
              <div className="video-session-detail-actions">
                <button
                  type="button"
                  className={`video-session-detail-btn video-session-detail-btn-icon-only ${liked ? "active" : ""} ${likeSubmitting ? "loading" : ""}`}
                  onClick={() => handleLikeAction(1)}
                  disabled={likeSubmitting}
                  title={`Like${likesCount ? ` (${likesCount})` : ""}`}
                >
                  {likeSubmitting ? (
                    <Spinner size={16} className="spinning" />
                  ) : (
                    <ThumbsUp size={16} weight={liked ? "fill" : "regular"} />
                  )}
                  <span className="video-session-detail-btn-label">Like {likesCount ? `(${likesCount})` : ""}</span>
                  <span className="video-session-detail-btn-count" aria-hidden="true">{likesCount ?? 0}</span>
                </button>
                <button
                  type="button"
                  className={`video-session-detail-btn video-session-detail-btn-icon-only ${disliked ? "active" : ""} ${likeSubmitting ? "loading" : ""}`}
                  onClick={() => handleLikeAction(0)}
                  disabled={likeSubmitting}
                  title={`Dislike${dislikesCount ? ` (${dislikesCount})` : ""}`}
                >
                  {likeSubmitting ? (
                    <Spinner size={16} className="spinning" />
                  ) : (
                    <ThumbsDown size={16} weight={disliked ? "fill" : "regular"} />
                  )}
                  <span className="video-session-detail-btn-label">Dislike {dislikesCount ? `(${dislikesCount})` : ""}</span>
                  <span className="video-session-detail-btn-count" aria-hidden="true">{dislikesCount ?? 0}</span>
                </button>

                {/* AI Summary */}
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
                      <button className="language-option" onClick={(e) => { e.stopPropagation(); handleSummarize("en"); }} disabled={loadingSummary}>English</button>
                      <button className="language-option" onClick={(e) => { e.stopPropagation(); handleSummarize("ar"); }} disabled={loadingSummary}>Arabic</button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={`video-session-detail-btn video-session-detail-btn-icon-only ${saved ? "active" : ""} ${saveSubmitting ? "loading" : ""}`}
                  onClick={handleSaveVideo}
                  disabled={saveSubmitting}
                  title={`Save${savedCount ? ` (${savedCount})` : ""}`}
                >
                  {saveSubmitting ? (
                    <Spinner size={16} className="spinning" />
                  ) : (
                    <BookmarkSimple size={16} weight={saved ? "fill" : "regular"} />
                  )}
                  <span className="video-session-detail-btn-label">Save {savedCount ? `(${savedCount})` : ""}</span>
                </button>

                {/* Share */}
                <div className="video-session-detail-share-wrap">
                  <button
                    type="button"
                    className="video-session-detail-btn video-session-detail-btn-icon-only"
                    onClick={(e) => { e.stopPropagation(); setShareOpen((prev) => !prev); }}
                    title="Share"
                    aria-expanded={shareOpen}
                    aria-haspopup="true"
                  >
                    <LinkSimple size={16} weight="regular" />
                    <span className="video-session-detail-btn-label">Share</span>
                  </button>
                  {shareOpen && (
                    <div className="video-session-detail-share-popover" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Share link">
                      <a className="video-session-detail-share-link" href={sharePath}>{shareUrl}</a>
                      <button type="button" className="video-session-detail-share-copy" onClick={handleCopyShare}>
                        {shareCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Download */}
                <button
                  className={`video-session-detail-btn vsd-download-btn ${downloading ? "loading" : ""}`}
                  onClick={handleDownloadClick}
                  disabled={downloading}
                  title="Download Video"
                >
                  {downloading ? <Spinner size={16} className="spinning" /> : <Download size={16} />}
                  <span>{downloading ? "Downloading..." : "Download"}</span>
                </button>

                {/* Admin menu */}
                {isAdmin && (
                  <div className="video-session-detail-admin-menu-wrap" ref={adminMenuRef}>
                    <button
                      type="button"
                      className="video-session-detail-btn video-session-detail-btn-dots"
                      onClick={(e) => { e.stopPropagation(); setShowAdminMenu((prev) => !prev); }}
                      title="More options"
                      aria-expanded={showAdminMenu}
                      aria-haspopup="true"
                    >
                      <DotsThreeVertical size={20} weight="bold" />
                    </button>
                    {showAdminMenu && (
                      <div className="video-session-detail-admin-dropdown" role="menu">
                        <button type="button" className="video-session-detail-admin-dropdown-item" role="menuitem"
                          onClick={(e) => { e.stopPropagation(); setShowAdminMenu(false); handleEditOpen(); }}>
                          <PencilSimple size={18} /><span>Edit</span>
                        </button>
                        <button type="button" className="video-session-detail-admin-dropdown-item video-session-detail-admin-dropdown-item-danger"
                          role="menuitem" disabled={deleting}
                          onClick={(e) => { e.stopPropagation(); setShowAdminMenu(false); setShowVideoDeleteModal(true); }}>
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
              {description && (<><h3>Video Description</h3><p>{description}</p></>)}
              {instructor && <p className="video-session-detail-instructor">Instructor: {instructor}</p>}
            </section>

            {/* Topics */}
            {topicList.length > 0 && (
              <section className="vsd-topics-section">
                <h3>Topics</h3>
                <div className="vsd-topics-container">
                  {topicList.map((topic, index) => (
                    <span key={index} className="vsd-topic-badge">{topic}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Comments */}
            <VsdCommentsSection
              user={user}
              commentCount={commentCount}
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              commentSubmitting={commentSubmitting}
              commentsSectionRef={commentsSectionRef}
              handlePostComment={handlePostComment}
              handleEditCommentOpen={handleEditCommentOpen}
              setCommentToDeleteId={setCommentToDeleteId}
              replyDrafts={replyDrafts}
              setReplyDraft={setReplyDraft}
              replySubmittingForId={replySubmittingForId}
              handlePostReply={handlePostReply}
              toggleReplyInput={toggleReplyInput}
              toggleRepliesVisibility={toggleRepliesVisibility}
              formatRelativeTime={formatRelativeTime}
              isRTL={isRTL}
            />
          </div>
        </div>

        {/* Related sidebar */}
        <aside className="video-session-detail-related">
          <div className="video-session-detail-related-list">
            {related.length === 0 ? (
              <p className="video-session-detail-related-empty">No other videos</p>
            ) : (
              related.slice(0, 8).map((s) => (
                <div
                  key={s.id ?? s.title}
                  className={`video-session-detail-related-item box-shadow-none${s._uploadPlaceholder ? " video-session-detail-related-item--uploading" : ""}`}
                  onClick={() => !s._uploadPlaceholder && onSelectSession?.(s)}
                  onKeyDown={(e) => e.key === "Enter" && !s._uploadPlaceholder && onSelectSession?.(s)}
                  role="button"
                  tabIndex={s._uploadPlaceholder ? -1 : 0}
                >
                  <div className="video-session-detail-related-thumb">
                    <VideoHoverPreviewThumb
                      fill
                      posterSrc={s.poster_url || s.thumbnailUrl || s.thumbnail_url || null}
                      rawVideoUrl={s.videoUrl || s.video_url}
                      alt={s.title || "Related Video"}
                    />
                    {s._uploadPlaceholder && (
                      <div className="video-session-detail-related-uploading-overlay"><span>In progress</span></div>
                    )}
                    <span className="video-session-detail-related-duration">{s.duration ?? "00:00"}</span>
                  </div>
                  <div className="video-session-detail-related-info">
                    <span className="video-session-detail-related-item-title">{s.title ?? "Video"}</span>
                    {(s.groupName || s.group_name) && <span className="video-session-detail-related-group">{s.groupName || s.group_name}</span>}
                    {(s.admin?.name || s.instructor) && <span className="video-session-detail-related-instructor">{s.admin?.name || s.instructor}</span>}
                    {(s.created_at || s.createdAt) && <span className="video-session-detail-related-date">{formatFullDate(s.created_at || s.createdAt)}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* AI Summary panel */}
      {showSummary && summaryData && (
        <div className="video-ai-summary">
          <div className="video-ai-summary-header">
            <div className="video-ai-summary-icon">
              <Lottie animationData={aiAnimation} style={{ width: 30, height: 30 }} />
              <span>AI Summary</span>
            </div>
            <button type="button" className="video-ai-summary-close" onClick={() => setShowSummary(false)} aria-label="Close AI Summary">✕</button>
          </div>
          <div className="video-ai-summary-content">
            <div className="video-ai-summary-summary">
              <h4>Summary</h4>
              <p>{typeof summaryData.summary === "string" ? summaryData.summary : "No summary available"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit modals */}
      <VsdVideoEditModals
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editSubmitting={editSubmitting}
        editForm={editForm}
        setEditForm={setEditForm}
        handleEditSubmit={handleEditSubmit}
        editingCommentId={editingCommentId}
        editCommentText={editCommentText}
        setEditCommentText={setEditCommentText}
        editCommentSubmitting={editCommentSubmitting}
        handleEditCommentClose={handleEditCommentClose}
        handleEditCommentSubmit={handleEditCommentSubmit}
      />

      {/* Confirm modals */}
      <VideoSessionDetailConfirmModals
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
