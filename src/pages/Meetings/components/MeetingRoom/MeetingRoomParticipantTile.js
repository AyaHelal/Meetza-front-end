import React, { useEffect } from "react";
import { HandWaving, ArrowsOut } from "@phosphor-icons/react";

function SelfVideo({ localVideoRef, stream }) {
  useEffect(() => {
    const el = localVideoRef?.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream, localVideoRef]);

  return (
    <video
      ref={localVideoRef}
      className="recordable-video"
      autoPlay
      playsInline
      muted
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

const MeetingRoomParticipantTile = ({
  tile,
  handRaisedForTile,
  isRemoteScreenShare,
  localVideoRef,
  remoteVideoRefsMap,
  localParticipantAudioMuted,
  localParticipantVolume,
  onToggleFullscreenScreenShare,
  onToggleFullscreenMember,
}) => {
  const key = tile?.socketId || tile?.member_id || tile?.label;
  const isRemoteMember = !tile?.isSelf && !!tile?.stream;

  return (
    <div
      key={key}
      className="meeting-room-tile"
      role={isRemoteScreenShare ? "button" : undefined}
      tabIndex={isRemoteScreenShare ? 0 : undefined}
      onClick={() => {
        if (isRemoteScreenShare) {
          onToggleFullscreenScreenShare(tile);
        }
      }}
      onKeyDown={(e) => {
        if (isRemoteScreenShare && (e.key === "Enter" || e.key === " ") && e.currentTarget) {
          e.preventDefault();
          onToggleFullscreenScreenShare(tile);
        }
      }}
      style={isRemoteScreenShare ? { cursor: "pointer" } : undefined}
      title={isRemoteScreenShare ? "Click to fullscreen, ESC to exit" : undefined}
    >
      <div className="meeting-room-tile-avatar" style={{ overflow: "hidden", position: "relative" }}>
        {(() => {
          const hasVideoTracks = tile?.stream && typeof tile.stream.getVideoTracks === "function" && tile.stream.getVideoTracks().length > 0;
          const hasValidStream = hasVideoTracks;

          if (hasValidStream) {
            return tile.isSelf ? (
              <SelfVideo
                localVideoRef={localVideoRef}
                stream={tile.stream}
              />
            ) : (
              <video
                key={`video-${tile.socketId}-${tile.stream?.id || "no-stream"}`}
                className="recordable-video"
                autoPlay
                playsInline
                muted={!!localParticipantAudioMuted[tile.socketId]}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                ref={(el) => {
                  if (el) {
                    remoteVideoRefsMap.current.set(tile.socketId, el);
                    if (tile.stream) {
                      if (el.srcObject !== tile.stream) {
                        el.srcObject = tile.stream;
                        console.log("📹 Set stream for remote video", tile.socketId);
                      }
                      el.muted = !!localParticipantAudioMuted[tile.socketId];
                      el.volume = localParticipantVolume[tile.socketId] ?? 1;

                      const playVideo = async () => {
                        try {
                          await el.play();
                          console.log("✅ Video playing for", tile.socketId);
                        } catch (err) {
                          console.warn("⚠️ Video play failed for", tile.socketId, "- retrying...", err);
                          setTimeout(() => {
                            el.play().catch((e) => {
                              console.error("❌ Video play retry failed for", tile.socketId, e);
                            });
                          }, 500);
                        }
                      };
                      playVideo();
                    }
                  } else {
                    remoteVideoRefsMap.current.delete(tile.socketId);
                  }
                }}
                onLoadedMetadata={() => {
                  const el = remoteVideoRefsMap.current.get(tile.socketId);
                  if (el && tile.stream) {
                    el.play().catch((err) => {
                      console.warn("⚠️ Video play on metadata load failed:", err);
                    });
                  }
                }}
                onCanPlay={() => {
                  const el = remoteVideoRefsMap.current.get(tile.socketId);
                  if (el && tile.stream) {
                    el.play().catch((err) => {
                      console.warn("⚠️ Video play on canPlay failed:", err);
                    });
                  }
                }}
              />
            );
          }

          const photoUrl = tile?.member_photo || tile?.memberPhoto || tile?.user_photo || tile?.photo;
          if (photoUrl) {
            return (
              <>
                <img
                  src={photoUrl}
                  alt={tile.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    const initial = e.target.nextElementSibling;
                    if (initial) initial.style.display = "flex";
                  }}
                />
                <span className="meeting-room-tile-initial" style={{ display: "none" }}>
                  {String(tile.label).trim().charAt(0).toUpperCase() || "?"}
                </span>
              </>
            );
          }
          return (
            <span className="meeting-room-tile-initial">
              {String(tile.label).trim().charAt(0).toUpperCase() || "?"}
            </span>
          );
        })()}
      </div>
      {handRaisedForTile && (
        <div className="meeting-room-hand-overlay" title="Raised hand">
          <HandWaving size={18} weight="bold" />
        </div>
      )}
      {isRemoteMember && (
        <button
          type="button"
          className="meeting-room-fullscreen-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreenMember(tile);
          }}
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          <ArrowsOut size={16} weight="bold" />
        </button>
      )}
      <span className={`meeting-room-tile-badge ${tile?.isSelf ? "you" : "admin"}`}>
        {tile?.isSelf ? "You" : tile.label}
      </span>
    </div>
  );
};

export default MeetingRoomParticipantTile;
