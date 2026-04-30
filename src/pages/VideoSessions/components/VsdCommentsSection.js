import React, { useState } from "react";
import { Trash, PencilSimple, PaperPlaneRight as PaperPlaneRightIcon } from "@phosphor-icons/react";
import { DEFAULT_AVATAR } from "../services/videoSessionDetailConstants";

export function VsdCommentsSection({
  user,
  commentCount,
  comments,
  commentText,
  setCommentText,
  commentSubmitting,
  commentsSectionRef,
  handlePostComment,
  handleEditCommentOpen,
  setCommentToDeleteId,
  replyDrafts,
  setReplyDraft,
  replySubmittingForId,
  handlePostReply,
  toggleReplyInput,
  toggleRepliesVisibility,
  formatRelativeTime,
  isRTL,
}) {
  const [showComments, setShowComments] = useState(true);

  return (
    <section className="video-session-detail-questions" ref={commentsSectionRef}>
      <button
        type="button"
        className="vsd-comments-toggle"
        onClick={() => setShowComments((prev) => !prev)}
        aria-expanded={showComments}
      >
        <h3>Comments {commentCount ? `(${commentCount})` : ""}</h3>
        <span className={`vsd-comments-toggle-icon ${showComments ? "open" : ""}`}>▾</span>
      </button>
      <div className={`vsd-comments-body ${showComments ? "open" : ""}`}>
        <div className="video-session-detail-comment-input">
          {(user?.Member_photo || user?.member_photo || user?.photo || user?.avatar) ? (
            <img
              src={user?.Member_photo || user?.member_photo || user?.photo || user?.avatar}
              alt={user?.name || user?.member_name || "Me"}
              className="video-session-detail-avatar"
              onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
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
              const canEditComment = user?.role === "Administrator" || user?.role === "Super_Admin" || user?.id === c.member_id || user?.id === c.memberId;
              return (
                <div key={c.id} className="vsd-comment">
                  {avatarUrl ? (
                    <img
                      className="vsd-comment-avatar"
                      src={avatarUrl}
                      alt={authorName}
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
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
                    <div className="vsd-comment-actions-row">
                      <button className="vsd-comment-reply-btn" onClick={() => toggleReplyInput(c.id)}>
                        Reply
                      </button>
                      {c.replies?.length > 0 && (
                        <button className="vsd-comment-reply-btn" onClick={() => toggleRepliesVisibility(c.id)}>
                          {c.showReplies ? "Hide replies" : `View ${c.replies.length} repl${c.replies.length === 1 ? "y" : "ies"}`}
                        </button>
                      )}
                    </div>
                    {c.showReplies && (c.replies || []).map((r) => {
                      const replyAuthor = r.member_name || r.author || r.user_name || r.name || "Anonymous";
                      const replyBody = r.comment_text || r.comment || r.text || "";
                      const replyTime = r.timestamp || r.time || r.created_at || r.createdAt || "";
                      const canEditReply = user?.role === "Administrator" || user?.role === "Super_Admin" || user?.id === r.member_id || user?.id === r.memberId;
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
                          {canEditReply && (
                            <div className="vsd-comment-actions">
                              <button className="vsd-edit-btn" onClick={() => handleEditCommentOpen(r)} title="Edit reply">
                                <PencilSimple size={16} />
                              </button>
                              <button className="vsd-delete-btn" onClick={() => setCommentToDeleteId(r.id)} title="Delete reply">
                                <Trash size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {c.showReplyInput && (
                      <div className="vsd-nested-input">
                        {(() => {
                          const currentUserName = user?.name || user?.member_name || user?.memberName || user?.email || "You";
                          const currentUserAvatar = user?.photo || user?.user_photo || user?.Member_photo || user?.member_photo || user?.avatar || user?.image || user?.picture || null;
                          if (currentUserAvatar) {
                            return (
                              <img
                                className="vsd-comment-avatar"
                                src={currentUserAvatar}
                                alt={currentUserName}
                                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
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
                        <button
                          type="button"
                          className="vsd-comment-reply-btn"
                          onClick={() => toggleReplyInput(c.id)}
                          disabled={replySubmittingForId === c.id}
                          aria-label="Cancel reply"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {canEditComment && (
                    <div className="vsd-comment-actions">
                      <button className="vsd-edit-btn" onClick={() => handleEditCommentOpen(c)} title="Edit">
                        <PencilSimple size={18} />
                      </button>
                      <button className="vsd-delete-btn" onClick={() => setCommentToDeleteId(c.id)} title="Delete">
                        <Trash size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
