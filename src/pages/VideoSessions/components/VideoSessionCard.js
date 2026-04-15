import React, { useState, useEffect, useRef } from "react";
import { DotsThreeVertical, PencilSimple, Trash, Download, Spinner } from "@phosphor-icons/react";
import { downloadVideo } from "../../../utils/videoUtils";
import { VideoHoverPreviewThumb } from "./VideoHoverPreviewThumb";
import "./VideoSessionCard.css";

const DEFAULT_THUMB =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";

function parseDurationLabelToSeconds(label) {
  if (label == null || typeof label !== "string") return 0;
  const parts = label.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** 0–100 for progress bar, or null when nothing to show */
function getCardWatchProgressPercent(session) {
  const rawPct = session?.progressPercentage ?? session?.progress_percentage;
  if (rawPct != null && rawPct !== "") {
    const n = Number(rawPct);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
  }
  const ws = (session?.watchStatus ?? session?.watch_status ?? "").toString().toLowerCase();
  if (ws.includes("complete")) return 100;
  const durSec =
    typeof session?.duration_seconds === "number" && session.duration_seconds > 0
      ? session.duration_seconds
      : parseDurationLabelToSeconds(String(session?.duration ?? ""));
  const watched = session?.watchProgressSeconds;
  if (durSec > 0 && typeof watched === "number" && watched >= 0) {
    return Math.min(100, (watched / durSec) * 100);
  }
  return null;
}

export default function VideoSessionCard({ session, onClick, isAdmin = false, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef(null);

  const rawVideoUrl = session?.videoUrl || session?.video_url;
  const thumbnailUrl = session?.thumbnailUrl || DEFAULT_THUMB;
  const duration = session?.duration ?? "24:22";
  const watchProgressPercent = getCardWatchProgressPercent(session);
  const title = session?.title ?? "Video Title";
  const groupLabel = session?.groupName ?? session?.group_name ?? null;
  const description = session?.description;
  const hasDescription = description && description.trim() !== "" && description.toLowerCase() !== "null";

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleCardClick = (e) => {
    if (menuRef.current && menuRef.current.contains(e.target)) return;
    onClick?.();
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen((prev) => !prev);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    onEdit?.(session);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    onDelete?.(session);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (downloading) return;

    downloadVideo(
      session?.videoUrl || session?.video_url,
      session?.title,
      () => setDownloading(true),
      () => setDownloading(false),
      () => setDownloading(false)
    );
  };

  return (
    <article
      className="video-session-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={`video-session-card-thumb-wrap${watchProgressPercent != null ? " video-session-card-thumb-wrap--progress" : ""}`}
      >
        <VideoHoverPreviewThumb
          fill
          posterSrc={thumbnailUrl}
          rawVideoUrl={rawVideoUrl}
          alt=""
        />
        {watchProgressPercent != null && (
          <div
            className="video-session-card-progress-track"
            role="progressbar"
            aria-label="Watch progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(watchProgressPercent)}
          >
            <div
              className="video-session-card-progress-fill"
              style={{ width: `${watchProgressPercent}%` }}
            />
          </div>
        )}
        <span className="video-session-card-duration">{duration}</span>
        <button
          className={`video-session-card-download-overlay ${downloading ? "downloading" : ""}`}
          onClick={handleDownload}
          disabled={downloading}
          title="Download video"
        >
          {downloading ? <Spinner size={20} className="spinning" /> : <Download size={20} />}
        </button>
      </div>
      <div className="video-session-card-content">
        <div className="video-session-card-text">
          <h3 className="video-session-card-title">{title}</h3>
          {!!groupLabel && (
            <span className="video-session-card-group" title={`Group: ${groupLabel}`}>
              {groupLabel}
            </span>
          )}

          {/* Topics Tags */}
          {(() => {
            const raw = session?.topics;
            if (!raw) return null;
            const getT = (v) => {
              if (Array.isArray(v)) return v;
              if (typeof v === 'string' && v.trim() !== '' && v.toLowerCase() !== 'null') {
                return v.split(',').map(t => t.trim()).filter(Boolean);
              }
              return [];
            };
            const allT = [...new Set([...getT(raw.en), ...getT(raw.ar), ...getT(raw)])];
            if (allT.length === 0) return null;
            return (
              <div className="video-session-card-topics">
                {allT.slice(0, 3).map((topic, idx) => (
                  <span key={idx} className="video-session-card-topic-tag">{topic}</span>
                ))}
                {allT.length > 3 && <span className="video-session-card-topic-tag">+{allT.length - 3}</span>}
              </div>
            );
          })()}

          {hasDescription && (
            <p className="video-session-card-description">{description}</p>
          )}
        </div>
        {isAdmin && (onEdit || onDelete) && (
          <div className="video-session-card-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="video-session-card-menu-btn"
              onClick={handleMenuClick}
              aria-label="Options"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <DotsThreeVertical size={22} weight="bold" />
            </button>
            {menuOpen && (
              <div className="video-session-card-dropdown" role="menu">
                {onEdit && (
                  <button type="button" className="video-session-card-dropdown-item" role="menuitem" onClick={handleEdit}>
                    <PencilSimple size={18} />
                    <span>Edit</span>
                  </button>
                )}
                {onDelete && (
                  <button type="button" className="video-session-card-dropdown-item video-session-card-dropdown-item-danger" role="menuitem" onClick={handleDelete}>
                    <Trash size={18} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
