import React, { useMemo } from "react";
import { getScreenShareTrack, isScreenShareVideoTrack } from "./meetingRoomUtils";

const MeetingRoomScreenPlaceholder = ({ adminTile, remoteVideoRefsMap, localParticipantAudioMuted, localParticipantVolume, meetingSpeakerMuted }) => {
  const displayStream = useMemo(() => {
    if (!adminTile?.stream) return null;
    const st = getScreenShareTrack(adminTile.stream);
    if (st) {
      return new MediaStream([st, ...adminTile.stream.getAudioTracks()]);
    }
    return adminTile.stream;
  }, [adminTile?.stream]);

  const streamHasLiveVideo =
    displayStream &&
    typeof displayStream.getVideoTracks === "function" &&
    displayStream.getVideoTracks().some((t) => {
      if (t.readyState === "ended") return false;
      if (t.readyState !== "live" && t.readyState !== "new") return false;
      if (isScreenShareVideoTrack(t)) return true;
      return t.enabled;
    });
  const hasVideo = !!(adminTile?.showVideo !== false && streamHasLiveVideo);
  const showAvatar = !hasVideo && adminTile;

  const audioFallback = !hasVideo && adminTile && displayStream ? (
    <audio
      key={`admin-audio-${adminTile.socketId}-${displayStream?.id || "no-stream"}`}
      autoPlay
      ref={(el) => {
        if (el) {
          if (remoteVideoRefsMap) {
            remoteVideoRefsMap.current?.set(adminTile.socketId, el);
          }
          if (el.srcObject !== displayStream) {
            el.srcObject = displayStream;
          }
          el.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted?.[adminTile.socketId];
          el.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume?.[adminTile.socketId] ?? 1);
          el.play().catch((err) => {
            if (err?.name !== "AbortError") console.warn("⚠️ Audio play retry failed for admin screen:", err);
          });
        }
      }}
    />
  ) : null;

  return (
    <div className={`meeting-room-screen ${hasVideo ? "has-video" : ""} ${showAvatar ? "has-placeholder" : ""}`}>
      <div className={`meeting-room-screen-preview ${hasVideo ? "has-video" : ""} ${showAvatar ? "has-placeholder" : ""}`}>
        {hasVideo ? (
          <video
            key={`admin-video-${adminTile.socketId}-${displayStream?.id || adminTile.stream?.id || "no-stream"}`}
            autoPlay
            playsInline
            muted={!!meetingSpeakerMuted || !!localParticipantAudioMuted?.[adminTile.socketId]}
            style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "0" }}
            ref={(el) => {
              if (el && displayStream) {
                if (remoteVideoRefsMap) {
                  remoteVideoRefsMap.current?.set(adminTile.socketId, el);
                }
                if (el.srcObject !== displayStream) {
                  el.srcObject = displayStream;
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
              return (
                <>
                  {audioFallback}
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={adminTile.label || "Admin"}
                      className="meeting-room-screen-placeholder-img"
                    />
                  ) : (
                    <span className="meeting-room-tile-initial">
                      {(adminTile.label || "Admin").toString().trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="meeting-room-screen-placeholder" />
        )}
      </div>
      <span className="meeting-room-tile-badge admin">Leader screen</span>
    </div>
  );
};

export default MeetingRoomScreenPlaceholder;
