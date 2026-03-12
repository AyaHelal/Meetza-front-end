import React, { useState, useRef ,} from "react";
import {
  ThumbsUp,
  ThumbsDown,
  BookmarkSimple,
  UserCircle,
  Sparkle,
  Trash,
  Play as PlayIcon,
  SpeakerSimpleLow as SpeakerSimpleLowIcon,
} from "@phosphor-icons/react";
import "./VideoSessionDetail.css";

const VolumeIcon = (props) => <SpeakerSimpleLowIcon size={18} {...props} />;

const DEFAULT_THUMB =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";

const SAMPLE_COMMENTS = [
  {
    id: 1,
    author: "Eslam Mohammed",
    time: "6 days ago",
    text: "لية دايما كانت تتكلم عن الطبيعة في ال mary oliver poetry",
    replies: [],
    showReplyInput: false,
  },
  {
    id: 2,
    author: "Eslam Mohammed",
    time: "6 days ago",
    text: "لية دايما كانت تتكلم عن الطبيعة في ال mary oliver poetry",
    replies: [],
    showReplyInput: false,
  },
  {
    id: 3,
    author: "Eslam Mohammed",
    time: "6 days ago",
    text: "لية دايما كانت تتكلم عن الطبيعة في ال mary oliver poetry",
    replies: [
      { id: 31, author: "Farida Emad", time: "6 days ago", text: "You should work more" },
    ],
    showReplyInput: false,
  },
];

export default function VideoSessionDetail({ session, relatedSessions, onBack, onSelectSession }) {
  const [liked, setLiked] = useState(true);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(SAMPLE_COMMENTS);
  const [progress, setProgress] = useState(80);
  const videoRef = useRef(null);

  if (!session) return null;

  const videoUrl = session.videoUrl || null;
  const thumbnailUrl = session.thumbnailUrl || DEFAULT_THUMB;
  const title = session.title ?? "Data Structure Lecture 1";
  const description = session.description ?? "Video Description";
  const instructor = session.instructor ?? "Instructor";

  const related = (relatedSessions || []).filter(
    (s) => (s.id ?? s.title) !== (session.id ?? session.title)
  );

  const toggleReplyInput = (id) =>
    setComments((prev) =>
      prev.map((c) => c.id === id ? { ...c, showReplyInput: !c.showReplyInput } : c)
    );

  const deleteComment = (id) =>
    setComments((prev) => prev.filter((c) => c.id !== id));

  const isRTL = (text) => /[\u0600-\u06FF]/.test(text);

  return (
    <div className="video-session-detail">
      {/* ── MAIN ── */}
      <div className="video-session-detail-main">

        {/* Player */}
        <div className="video-session-detail-player-wrap">
          {videoUrl ? (
            <video ref={videoRef} className="video-session-detail-player" src={videoUrl} poster={thumbnailUrl} />
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
              onChange={(e) => setProgress(Number(e.target.value))}
              style={{ "--progress": `${progress}%` }}
            />
            <div className="video-session-detail-controls-row">
              <button className="video-ctrl-btn" type="button"><PlayIcon size={18} weight="regular" /></button>
              <button className="video-ctrl-btn" type="button"><SpeakerSimpleLowIcon size={18} weight="regular" /></button>
              <span className="video-time">32:00 / 40:00</span>
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
                onClick={() => { setLiked((v) => !v); if (!liked) setDisliked(false); }}
              >
                <ThumbsUp size={16} weight={liked ? "fill" : "regular"} />
                <span>Like</span>
              </button>
              <button
                type="button"
                className={`video-session-detail-btn ${disliked ? "active" : ""}`}
                onClick={() => { setDisliked((v) => !v); if (!disliked) setLiked(false); }}
              >
                <ThumbsDown size={16} weight={disliked ? "fill" : "regular"} />
                <span>Dislike</span>
              </button>
              <button type="button" className="video-session-detail-btn">
                <Sparkle size={16} />
                <span>Ask</span>
              </button>
              <button
                type="button"
                className={`video-session-detail-btn ${saved ? "active" : ""}`}
                onClick={() => setSaved((v) => !v)}
              >
                <BookmarkSimple size={16} weight={saved ? "fill" : "regular"} />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <section className="video-session-detail-description">
            <h3>Video Description</h3>
            <p>{description}</p>
            {instructor && <p className="video-session-detail-instructor">Instructor: {instructor}</p>}
          </section>

          {/* Comments */}
          <section className="video-session-detail-questions">
            <h3>Student Questions</h3>

            <div className="video-session-detail-comment-input">
              <UserCircle size={28} className="video-session-detail-avatar" />
              <input
                type="text"
                placeholder="Add a comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="video-session-detail-comment-field"
              />
            </div>

            <div className="video-session-detail-comments-list">
              {comments.length === 0 ? (
                <p className="video-session-detail-comments-empty">No comments yet. Be the first to ask.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="vsd-comment">
                    <UserCircle size={26} className="vsd-comment-avatar" />
                    <div className="vsd-comment-body">
                      <div className="vsd-comment-header">
                        <span className="vsd-comment-author">{c.author}</span>
                        <span className="vsd-comment-time">{c.time}</span>
                      </div>
                      <p className={`vsd-comment-text ${isRTL(c.text) ? "" : "ltr"}`}>{c.text}</p>
                      <button className="vsd-comment-reply-btn" onClick={() => toggleReplyInput(c.id)}>
                        Reply
                      </button>

                      {c.replies.map((r) => (
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
                      <button className="vsd-delete-btn" onClick={() => deleteComment(c.id)} title="Delete">
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                ))
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
                  <img src={s.thumbnailUrl || DEFAULT_THUMB} alt="" />
                  <span className="video-session-detail-related-duration">{s.duration ?? "24:22"}</span>
                </div>
                <div className="video-session-detail-related-info">
                  <span className="video-session-detail-related-item-title">{s.title ?? "Video"}</span>
                  {(s.instructor || instructor) && (
                    <span className="video-session-detail-related-instructor">{s.instructor ?? instructor}</span>
                  )}
                  {s.createdAt && (
                    <span className="video-session-detail-related-date">
                      {typeof s.createdAt === "string" ? s.createdAt : s.createdAt?.toLocaleDateString?.() ?? ""}
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