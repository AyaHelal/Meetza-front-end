import React from "react";
import "./VideoSessionCard.css";

const DEFAULT_THUMB =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";

export default function VideoSessionCard({ session, onClick }) {
  const thumbnailUrl = session?.thumbnailUrl || DEFAULT_THUMB;
  const duration = session?.duration ?? "24:22";
  const title = session?.title ?? "Video Title";
  const description = session?.description ?? "Video Description";

  return (
    <article
      className="video-session-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
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
      </div>
      <h3 className="video-session-card-title">{title}</h3>
      <p className="video-session-card-description">{description}</p>
    </article>
  );
}
