import { useEffect } from "react";

/**
 * Runs effects that: attach local stream to video elements, sync mute state to tracks,
 * restore camera/mic after refresh, sync remote video refs mute/volume, ensure remote videos play.
 */
export function useMeetingRoomMediaEffects({
  localStreamRef,
  cameraVideoTrackRef,
  localVideoRef,
  localVideoRef2,
  remoteVideoRefsMap,
  videoMuted,
  audioMuted,
  screenSharing,
  hasJoined,
  ensureMediaTracks,
  remoteStreams,
  localParticipantAudioMuted,
  localParticipantVolume,
  meetingSpeakerMuted,
}) {
  // Attach stream to both video elements when it changes — but not when screen sharing:
  // during screen share each self tile (camera vs screen) gets its own stream from the hook;
  // overwriting with the full stream here would show camera in place of screen.
  useEffect(() => {
    if (screenSharing) return;
    const stream = localStreamRef.current;
    const videoEl1 = localVideoRef.current;
    const videoEl2 = localVideoRef2.current;

    if (stream) {
      if (videoEl1) videoEl1.srcObject = stream;
      if (videoEl2) videoEl2.srcObject = stream;
    }
  }, [videoMuted, audioMuted, screenSharing]);

  // Sync videoMuted/audioMuted to track enabled state (camera only for video - never touch screen share)
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const cameraTrack = cameraVideoTrackRef.current;
    if (cameraTrack) cameraTrack.enabled = !videoMuted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !audioMuted));
  }, [videoMuted, audioMuted]);

  // Restore camera/mic state on mount if they were enabled before refresh
  useEffect(() => {
    if (!hasJoined || !localStreamRef.current) return;

    const restoreMediaState = async () => {
      try {
        if (!videoMuted && !screenSharing) {
          const cameraTrack = cameraVideoTrackRef.current;
          if (!cameraTrack) {
            await ensureMediaTracks({ needVideo: true });
            const restoredTrack = cameraVideoTrackRef.current;
            if (restoredTrack) {
              restoredTrack.enabled = true;
              const stream = localStreamRef.current;
              if (stream) {
                setTimeout(() => {
                  if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                  if (localVideoRef2.current) localVideoRef2.current.srcObject = stream;
                }, 100);
              }
            }
          } else {
            cameraTrack.enabled = true;
            const stream = localStreamRef.current;
            if (stream) {
              setTimeout(() => {
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                if (localVideoRef2.current) localVideoRef2.current.srcObject = stream;
              }, 100);
            }
          }
        }

        if (!audioMuted) {
          const hasAudio = localStreamRef.current.getAudioTracks().length > 0;
          if (!hasAudio) {
            await ensureMediaTracks({ needAudio: true, needVideo: false });
          }
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
        }
      } catch (error) {
        console.warn("⚠️ Failed to restore media state after refresh:", error);
      }
    };

    restoreMediaState();
  }, [hasJoined, videoMuted, audioMuted, screenSharing, ensureMediaTracks]);

  // Sync local participant audio/volume + meeting speaker mute to remote video elements
  useEffect(() => {
    remoteVideoRefsMap.current.forEach((el, socketId) => {
      if (el) {
        el.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted[socketId];
        el.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume[socketId] ?? 1);
        if (el.paused && el.srcObject) {
          el.play().catch((err) => {
            if (err?.name !== "AbortError") console.warn("⚠️ Failed to play video after audio state change:", err);
          });
        }
      }
    });
  }, [localParticipantAudioMuted, localParticipantVolume, meetingSpeakerMuted]);

  // Ensure remote videos play when streams are updated (screen tile ref key is `${socketId}-screen`)
  useEffect(() => {
    remoteStreams.forEach(({ socketId, stream, isScreenShare }) => {
      const videoKey = isScreenShare ? `${socketId}-screen` : socketId;
      const videoEl = remoteVideoRefsMap.current.get(videoKey);
      if (videoEl && stream) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          console.log("🔄 Updated video srcObject for", videoKey);
        }
        if (videoEl.paused) {
          videoEl.play().catch((err) => {
            if (err?.name !== "AbortError") console.warn("⚠️ Failed to play video for", videoKey, ":", err);
          });
        }
      }
    });
  }, [remoteStreams]);
}
