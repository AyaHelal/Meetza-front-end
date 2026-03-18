import React from "react";
import { Trash } from "@phosphor-icons/react";
import { DEFAULT_THUMB } from "./constants";
import { formatSavedVideoCardDate } from "../utils/formatSavedVideoCardDate";
import "../../VideoSessions/components/VideoSessionDetail.css";
import "./SavedVideosSidebar.css";

export default function SavedVideosSidebar({ videos, selectedId, onSelect, onRemove, removingId }) {
  return (
    <aside className="saved-videos-left-list">
      <div className="video-session-detail-related-list">
        {videos.length === 0 ? (
          <p className="video-session-detail-related-empty">
            {selectedId ? "No other saved videos" : "No saved videos"}
          </p>
        ) : (
          videos.map((v) => {
            const isActive = String(v.id) === String(selectedId);
            const isRemoving = removingId != null && String(removingId) === String(v.id);
            return (
              <div
                key={v.id ?? v.title}
                className={`video-session-detail-related-item saved-videos-card ${isActive ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(v)}
                onKeyDown={(e) => e.key === "Enter" && onSelect?.(v)}
              >
                <div className="video-session-detail-related-thumb saved-videos-card-thumb">
                  <img
                    src={v.thumbnailUrl || DEFAULT_THUMB}
                    alt={v.title || "Video"}
                    className="img-fluid"
                  />
                  <span className="video-session-detail-related-duration">
                    {v.duration ?? "00:00"}
                  </span>
                </div>
                <div className="video-session-detail-related-info saved-videos-card-info">
                  <span className="video-session-detail-related-item-title">
                    {v.title || "Video"}
                  </span>
                  {!!v.instructor && (
                    <span className="video-session-detail-related-instructor">{v.instructor}</span>
                  )}
                  {!!v.createdAt && (
                    <span className="video-session-detail-related-date">
                      {formatSavedVideoCardDate(v.createdAt)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="saved-videos-remove-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove?.(v);
                  }}
                  aria-label="Remove from saved videos"
                  title="Remove"
                  disabled={isRemoving}
                >
                  <Trash size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

