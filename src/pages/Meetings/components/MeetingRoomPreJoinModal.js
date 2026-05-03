import React from "react";

/**
 * Pre-join modal UI: camera/mic preview and toggles before entering the meeting.
 * Pure presentational; all behavior via props.
 */
function MeetingRoomPreJoinModal({
  visible,
  stream,
  videoMuted,
  audioMuted,
  loading,
  error,
  videoRef,
  onClose,
  onToggleVideo,
  onToggleAudio,
  onEnter,
  onClearError,
}) {
  if (!visible) return null;

  return (
    <div className="meeting-room-prejoin-overlay">
      <div className="meeting-room-prejoin-modal">
        <h3 className="meeting-room-prejoin-title">Join meeting</h3>
        <p className="meeting-room-prejoin-subtitle">
          Camera and microphone are required. You can turn them off below before entering.
        </p>
        {loading && (
          <div className="meeting-room-prejoin-loading">
            <span>Requesting camera and microphone…</span>
          </div>
        )}
        {error && (
          <div className="meeting-room-prejoin-error">
            <p>{error}</p>
            <button type="button" className="meeting-room-prejoin-retry" onClick={onClearError}>
              Try again
            </button>
          </div>
        )}
        {stream && !loading && (
          <>
            <div className="meeting-room-prejoin-preview">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="meeting-room-prejoin-video"
                style={{ display: videoMuted ? "none" : "block" }}
              />
              {videoMuted && <div className="meeting-room-prejoin-video-off">Camera off</div>}
            </div>
            <div className="meeting-room-prejoin-toggles">
              <button
                type="button"
                className={`meeting-room-prejoin-toggle ${audioMuted ? "muted" : ""}`}
                onClick={onToggleAudio}
                title={audioMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {audioMuted ? "🎤 Muted" : "🎤 Microphone on"}
              </button>
              <button
                type="button"
                className={`meeting-room-prejoin-toggle ${videoMuted ? "muted" : ""}`}
                onClick={onToggleVideo}
                title={videoMuted ? "Turn camera on" : "Turn camera off"}
              >
                {videoMuted ? "📷 Camera off" : "📷 Camera on"}
              </button>
            </div>
            <div className="meeting-room-prejoin-actions">
              <button type="button" className="meeting-room-prejoin-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="meeting-room-prejoin-enter" onClick={onEnter}>
                Enter meeting
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MeetingRoomPreJoinModal;
