import React from "react";
import { HandWaving } from "@phosphor-icons/react";

const MeetingRoomSingleView = ({
  localVideoRef2,
  videoMuted,
  screenSharing,
  selfPhoto,
  user,
  handRaised,
}) => {
  return (
    <div className="meeting-room-single">
      {/* Local tile large (no fullscreen on own screen share - it's your screen) */}
      <div className="meeting-room-tile-large">
        <div className="meeting-room-tile-avatar large" style={{ overflow: "hidden" }}>
          {(!videoMuted || screenSharing) ? (
            <video
              ref={localVideoRef2}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (typeof selfPhoto === "string" && selfPhoto.trim()) ? (
            <img
              src={selfPhoto.trim()}
              alt="Your profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                console.warn("❌ Failed to load profile photo:", selfPhoto);
                e.target.style.display = "none";
              }}
            />
          ) : (
            <span className="meeting-room-tile-initial">
              {(user?.name || user?.member_name || user?.email || "You")
                .toString()
                .trim()
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>
        {/* raised hand indicator for single view */}
        {handRaised && (
          <div className="meeting-room-hand-overlay" title="Raised hand">
            <HandWaving size={18} weight="bold" />
          </div>
        )}
        <span className="meeting-room-tile-badge you">You</span>
      </div>
    </div>
  );
};

export default MeetingRoomSingleView;
