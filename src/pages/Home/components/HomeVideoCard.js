import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle, PlayCircle } from "@phosphor-icons/react";

function clamp01(n) {
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.max(0, Math.min(100, x));
}

/** Open All Videos page with selection (same UX as clicking a card on /video). */
function getOpenVideoStateFromHome(video) {
  const raw = video?.raw;
  const id = video?.id ?? raw?.id ?? raw?._id ?? raw?.video_id ?? raw?.videoId;
  const slug = video?.slug ?? raw?.slug;
  const idStr = id != null && String(id).trim() !== "" ? String(id) : undefined;
  const slugStr = slug != null && String(slug).trim() !== "" ? String(slug) : undefined;
  if (!idStr && !slugStr) return null;
  return { openVideoId: idStr, openVideoSlug: slugStr };
}

/** Id used by SavedVideosPage to match `savedVideos` list (see location.state.selectVideoId). */
function getSavedListVideoId(video) {
  const raw = video?.raw;
  return (
    video?.id ??
    raw?.id ??
    raw?._id ??
    raw?.video_id ??
    raw?.videoId ??
    null
  );
}

/**
 * @param {"session" | "saved"} linkTarget
 *   session → full video page (related videos, etc.)
 *   saved → Saved Videos layout (sidebar list + detail)
 */
function getVideoGroupLabel(video) {
  const raw = video?.raw;
  const g =
    video?.groupName ??
    video?.group_name ??
    raw?.group_name ??
    raw?.groupName ??
    raw?.group?.group_name ??
    raw?.group?.name ??
    "";
  const s = String(g).trim();
  return s || null;
}

export default function HomeVideoCard({ video, linkTarget = "session" }) {
  const title = video?.title ?? "How to live";
  const groupLabel = getVideoGroupLabel(video);
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

  let Root = "article";
  let rootProps = { className: "home-video-card", "aria-label": title };

  if (linkTarget === "saved") {
    const selectId = getSavedListVideoId(video);
    if (selectId != null && String(selectId).trim() !== "") {
      Root = Link;
      rootProps = {
        to: "/saved-videos",
        state: { selectVideoId: String(selectId) },
        className: "home-video-card home-video-card--link",
        "aria-label": title,
      };
    }
  } else {
    const openState = getOpenVideoStateFromHome(video);
    if (openState) {
      Root = Link;
      rootProps = {
        to: "/video",
        state: openState,
        className: "home-video-card home-video-card--link",
        "aria-label": title,
      };
    }
  }

  return (
    <Root {...rootProps}>
      <div className="home-video-card-thumb">
        <img className="home-video-card-thumb-img" src={thumbnailUrl} alt="" />
      </div>

      <div className="home-video-card-body">
        <h3 className={`home-video-card-title${groupLabel ? "" : " home-video-card-title--solo"}`}>{title}</h3>
        {groupLabel ? <p className="home-video-card-group">{groupLabel}</p> : null}

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
    </Root>
  );
}

