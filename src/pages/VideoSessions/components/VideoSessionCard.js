import React, { useState, useEffect, useRef } from "react";
import { DotsThreeVertical, PencilSimple, Trash, Download, Spinner } from "@phosphor-icons/react";
import { downloadVideo } from "../../../utils/videoUtils";
import "./VideoSessionCard.css";

const DEFAULT_THUMB =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";

export default function VideoSessionCard({ session, onClick, isAdmin = false, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef(null);

  const thumbnailUrl = session?.thumbnailUrl || DEFAULT_THUMB;
  const duration = session?.duration ?? "24:22";
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
      <div className="video-session-card-thumb-wrap">
        <img
          src={thumbnailUrl}
          alt=""
          className="video-session-card-thumb"
        />
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
