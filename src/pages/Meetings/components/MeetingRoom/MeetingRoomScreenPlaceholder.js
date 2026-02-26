import React from "react";

const MeetingRoomScreenPlaceholder = ({ adminTile, remoteVideoRefsMap, localParticipantAudioMuted, localParticipantVolume, meetingSpeakerMuted }) => {
  const hasVideo = adminTile?.stream && typeof adminTile.stream.getVideoTracks === "function" && adminTile.stream.getVideoTracks().length > 0;

  return (
    <div className={`meeting-room-screen ${hasVideo ? "has-video" : ""}`}>
      <div className={`meeting-room-screen-preview ${hasVideo ? "has-video" : ""}`}>
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
                  console.log("📹 Set admin stream for screen view", adminTile.socketId);
                }
                el.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted?.[adminTile.socketId];
                el.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume?.[adminTile.socketId] ?? 1);
                el.play().catch((err) => {
                  console.warn("⚠️ Video play failed for admin screen:", err);
                });
              }
            }}
            onLoadedMetadata={() => {
              const el = remoteVideoRefsMap?.current?.get(adminTile.socketId);
              if (el) {
                el.play().catch((err) => {
                  console.warn("⚠️ Video play on metadata load failed:", err);
                });
              }
            }}
            onCanPlay={() => {
              const el = remoteVideoRefsMap?.current?.get(adminTile.socketId);
              if (el) {
                el.play().catch((err) => {
                  console.warn("⚠️ Video play on canPlay failed:", err);
                });
              }
            }}
          />
        ) : (
          <div className="meeting-room-screen-placeholder" />
        )}
      </div>
      <span className="meeting-room-tile-badge admin">Admin screen</span>
    </div>
  );
};

export default MeetingRoomScreenPlaceholder;
