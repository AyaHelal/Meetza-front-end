import React from "react";
import Ratio from "react-bootstrap/Ratio";
import { formatSavedVideoDuration } from "../services/profilePageUtils";

export function ProfileSavedVideoCard({ video, onOpen }) {
  const title = video?.title || "Video";
  const thumb = video?.thumbnailUrl || video?.thumbnail_url || video?.poster_url || null;
  const durationLabel = formatSavedVideoDuration(video?.duration);
  const fallbackThumb = "/assets/video-standard.png";

  return (
    <div className="profile-saved-videos-tile">
      <button
        type="button"
        className="profile-saved-video-card profile-saved-video-card--live w-100 text-start border-0 p-0 bg-transparent"
        aria-label={`Open saved video: ${title}`}
        onClick={() => onOpen?.(video)}
      >
        <Ratio aspectRatio="16x9">
          <div className="profile-saved-video-frame overflow-hidden">
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="profile-saved-video-thumb position-absolute top-0 start-0 w-100 h-100 object-fit-cover"
              />
            ) : (
              <img
                src={fallbackThumb}
                alt=""
                className="profile-saved-video-thumb position-absolute top-0 start-0 w-100 h-100 object-fit-cover"
              />
            )}
            <div className="profile-saved-pills" dir="ltr">
              <span className="profile-saved-pill profile-saved-pill--title text-truncate">{title}</span>
              <span className="profile-saved-pill profile-saved-pill--dur">{durationLabel}</span>
            </div>
          </div>
        </Ratio>
      </button>
    </div>
  );
}
