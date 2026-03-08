import React from "react";

const MeetingRoomScreenPlaceholder = ({ adminTile, remoteVideoRefsMap, localParticipantAudioMuted, localParticipantVolume, meetingSpeakerMuted }) => {
  const streamHasLiveVideo =
    adminTile?.stream &&
    typeof adminTile.stream.getVideoTracks === "function" &&
    adminTile.stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
  const hasVideo = !!(adminTile?.showVideo !== false && streamHasLiveVideo);
  const showAvatar = !hasVideo && adminTile;

  return (
    <div className={`meeting-room-screen ${hasVideo ? "has-video" : ""} ${showAvatar ? "has-placeholder" : ""}`}>
      <div className={`meeting-room-screen-preview ${hasVideo ? "has-video" : ""} ${showAvatar ? "has-placeholder" : ""}`}>
        {hasVideo ? (
          <video
            key={`admin-video-${adminTile.socketId}-${adminTile.stream?.id || "no-stream"}`}
            autoPlay
            playsInline
            muted={!!meetingSpeakerMuted || !!localParticipantAudioMuted?.[adminTile.socketId]}
            style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "0" }}
            ref={(el) => {
              if (el && adminTile.stream) {
                if (remoteVideoRefsMap) {
                  remoteVideoRefsMap.current?.set(adminTile.socketId, el);
                }
                if (el.srcObject !== adminTile.stream) {
                  el.srcObject = adminTile.stream;
                }
                el.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted?.[adminTile.socketId];
                el.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume?.[adminTile.socketId] ?? 1);
                el.play().catch((err) => {
                  if (err?.name !== "AbortError") console.warn("⚠️ Video play failed for admin screen:", err);
                });
              }
            }}
            onLoadedMetadata={() => {
              const el = remoteVideoRefsMap?.current?.get(adminTile.socketId);
              if (el) {
                el.play().catch((err) => {
                  if (err?.name !== "AbortError") console.warn("⚠️ Video play on metadata load failed:", err);
                });
              }
            }}
            onCanPlay={() => {
              const el = remoteVideoRefsMap?.current?.get(adminTile.socketId);
              if (el) {
                el.play().catch((err) => {
                  if (err?.name !== "AbortError") console.warn("⚠️ Video play on canPlay failed:", err);
                });
              }
            }}
          />
        ) : adminTile ? (
          <div className="meeting-room-screen-placeholder meeting-room-screen-placeholder-avatar">
            {(() => {
              const photo =
                adminTile.member_photo ||
                adminTile.memberPhoto ||
                adminTile.user_photo ||
                adminTile.photo;
              const photoUrl = typeof photo === "string" && photo.trim() ? photo.trim() : null;
              return photoUrl ? (
                <img
                  src={photoUrl}
                  alt={adminTile.label || "Admin"}
                  className="meeting-room-screen-placeholder-img"
                />
              ) : (
                <span className="meeting-room-tile-initial">
                  {(adminTile.label || "Admin").toString().trim().charAt(0).toUpperCase()}
                </span>
              );
            })()}
          </div>
        ) : (
          <div className="meeting-room-screen-placeholder" />
        )}
      </div>
      <span className="meeting-room-tile-badge admin">Admin screen</span>
    </div>
  );
};

export default MeetingRoomScreenPlaceholder;
