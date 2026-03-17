import React, { useEffect } from "react";
import { HandWaving, ArrowsOut } from "@phosphor-icons/react";

function SelfVideo({ localVideoRef, stream }) {
  useEffect(() => {
    const el = localVideoRef?.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => { });
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
  meetingSpeakerMuted,
  onToggleFullscreenScreenShare,
  onToggleFullscreenMember,
}) => {
  const key = tile?.tileId || tile?.socketId || tile?.member_id || tile?.label;
  const refKey = tile?.tileId || tile?.socketId;
  const isRemoteMember = !tile?.isSelf && !!tile?.stream;
  const isScreenOnlyTile = tile?.isScreenOnlyTile === true;

  return (
    <div
      key={key}
      className={`meeting-room-tile ${isScreenOnlyTile ? "meeting-room-tile-screen-only" : ""}`}
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
          const hasLiveVideo = tile?.stream && typeof tile.stream.getVideoTracks === "function" &&
            tile.stream.getVideoTracks().some((t) => t.readyState === "live");
          const shouldShowVideo = hasLiveVideo && (tile?.showVideo !== false);

          if (shouldShowVideo) {
            return tile.isSelf ? (
              <SelfVideo
                localVideoRef={localVideoRef}
                stream={tile.stream}
              />
            ) : (
              <video
                key={`video-${refKey}-${tile.stream?.id || "no-stream"}`}
                className="recordable-video"
                autoPlay
                playsInline
                muted={!!meetingSpeakerMuted || !!localParticipantAudioMuted[tile.socketId]}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                ref={(el) => {
                  if (el) {
                    remoteVideoRefsMap.current.set(refKey, el);
                    if (tile.stream) {
                      if (el.srcObject !== tile.stream) {
                        el.srcObject = tile.stream;
                      }
                      el.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted[tile.socketId];
                      el.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume[tile.socketId] ?? 1);

                      const playVideo = async () => {
                        try {
                          await el.play();
                        } catch (err) {
                          if (err?.name === "AbortError") return;
                          setTimeout(() => {
                            el.play().catch((e) => {
                              if (e?.name !== "AbortError") console.error("❌ Video play retry failed for", refKey, e);
                            });
                          }, 500);
                        }
                      };
                      playVideo();
                    }
                  } else {
                    remoteVideoRefsMap.current.delete(refKey);
                  }
                }}
                onLoadedMetadata={() => {
                  const el = remoteVideoRefsMap.current.get(refKey);
                  if (el && tile.stream) {
                    el.play().catch((err) => {
                      if (err?.name !== "AbortError") console.warn("⚠️ Video play on metadata load failed:", err);
                    });
                  }
                }}
                onCanPlay={() => {
                  const el = remoteVideoRefsMap.current.get(refKey);
                  if (el && tile.stream) {
                    el.play().catch((err) => {
                      if (err?.name !== "AbortError") console.warn("⚠️ Video play on canPlay failed:", err);
                    });
                  }
                }}
              />
            );
          }

          const photoUrl = tile?.member_photo || tile?.memberPhoto || tile?.user_photo || tile?.photo;
          const photoSrc = (typeof photoUrl === "string" && photoUrl.trim()) ? photoUrl.trim() : null;

          const audioFallback = !tile.isSelf && tile.stream ? (
            <audio
              key={`audio-${refKey}-${tile.stream?.id || "no-stream"}`}
              autoPlay
              ref={(el) => {
                if (el) {
                  remoteVideoRefsMap.current.set(refKey, el);
                  if (tile.stream) {
                    if (el.srcObject !== tile.stream) {
                      el.srcObject = tile.stream;
                    }
                    el.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted[tile.socketId];
                    el.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume[tile.socketId] ?? 1);

                    const playAudio = async () => {
                      try {
                        await el.play();
                      } catch (err) {
                        if (err?.name === "AbortError") return;
                        setTimeout(() => {
                          el.play().catch((e) => {
                            if (e?.name !== "AbortError") console.warn("⚠️ Audio play retry failed for", refKey, e);
                          });
                        }, 500);
                      }
                    };
                    playAudio();
                  }
                } else {
                  // Only delete if the map currently holds this element to prevent race conditions during unmounts
                  if (remoteVideoRefsMap.current.get(refKey) === el) {
                    remoteVideoRefsMap.current.delete(refKey);
                  }
                }
              }}
            />
          ) : null;

          if (photoSrc) {
            return (
              <>
                {audioFallback}
                <img
                  src={photoSrc}
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
            <>
              {audioFallback}
              <span className="meeting-room-tile-initial">
                {String(tile.label).trim().charAt(0).toUpperCase() || "?"}
              </span>
            </>
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
        {tile?.isScreenOnlyTile ? (tile.label || "Screen") : (tile?.isSelf ? "You" : tile.label)}
      </span>
    </div>
  );
};

export default MeetingRoomParticipantTile;
