import React from "react";
import { CheckCircle, PlayCircle } from "@phosphor-icons/react";

function clamp01(n) {
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.max(0, Math.min(100, x));
}

export default function HomeVideoCard({ video }) {
  const title = video?.title ?? "How to live";
  const status = (video?.status ?? "watching").toLowerCase();
  const progress = clamp01(video?.progress);
  const thumbnailUrl =
    video?.thumbnailUrl ||
    video?.thumbnail_url ||
    video?.poster_url ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60";

  const isWatching = status === "watching";
  const statusLabel = isWatching ? "Watching" : "Completed";
  const StatusIcon = isWatching ? PlayCircle : CheckCircle;

  return (
    <article className="home-video-card" aria-label={title}>
      <div className="home-video-card-thumb">
        <img className="home-video-card-thumb-img" src={thumbnailUrl} alt="" />
      </div>

      <div className="home-video-card-body">
        <h3 className="home-video-card-title">{title}</h3>

        <div className="home-video-card-status">
          <span className="home-video-card-status-icon" aria-hidden="true">
            <StatusIcon size={18} weight="fill" />
          </span>
          <span className="home-video-card-status-text">{statusLabel}</span>
        </div>

        {isWatching && (
          <div
            className="home-video-card-progress"
            role="progressbar"
            aria-label="Watching progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span
              className="home-video-card-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

