import { useCallback, useEffect, useRef } from "react";

/**
 * Manages fullscreen video overlays for screen share and member video.
 * Returns refs and toggle callbacks; runs fullscreen change listener and sync effects.
 */
export function useMeetingRoomFullscreen({
  localParticipantAudioMuted,
  localParticipantVolume,
  remoteStreams,
}) {
  const screenShareFullscreenRef = useRef(null);
  const memberVideoFullscreenRef = useRef(null);
  const fullscreenStreamRef = useRef(null);
  const fullscreenSocketIdRef = useRef(null);
  const screenShareVideoRef = useRef(null);
  const memberVideoVideoRef = useRef(null);

  const toggleFullscreenForScreenShare = useCallback((tile) => {
    if (!tile?.isScreenShare || tile?.isSelf || !tile?.stream) return;
    const el = screenShareFullscreenRef.current;
    const video = screenShareVideoRef.current;
    if (!el || !video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    fullscreenStreamRef.current = tile.stream;
    fullscreenSocketIdRef.current = tile.socketId;

    el.style.visibility = "visible";
    el.style.pointerEvents = "auto";

    video.srcObject = tile.stream;
    video.muted = !!localParticipantAudioMuted[tile.socketId];
    video.volume = localParticipantVolume[tile.socketId] ?? 1;

    setTimeout(() => {
      video.play?.().then(() => {
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      }).catch(() => {
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      });
    }, 50);
  }, [localParticipantAudioMuted, localParticipantVolume]);

  const toggleFullscreenForMember = useCallback((tile) => {
    if (tile?.isSelf || !tile?.stream) return;
    const el = memberVideoFullscreenRef.current;
    const video = memberVideoVideoRef.current;
    if (!el || !video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    fullscreenStreamRef.current = tile.stream;
    fullscreenSocketIdRef.current = tile.socketId;

    el.style.visibility = "visible";
    el.style.pointerEvents = "auto";

    video.srcObject = tile.stream;
    video.muted = !!localParticipantAudioMuted[tile.socketId];
    video.volume = localParticipantVolume[tile.socketId] ?? 1;

    setTimeout(() => {
      video.play?.().then(() => {
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      }).catch(() => {
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      });
    }, 50);
  }, [localParticipantAudioMuted, localParticipantVolume]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (screenShareFullscreenRef.current) {
          const el = screenShareFullscreenRef.current;
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          const v = screenShareVideoRef.current;
          if (v) {
            v.pause();
            v.srcObject = null;
          }
        }
        if (memberVideoFullscreenRef.current) {
          const el = memberVideoFullscreenRef.current;
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          const v = memberVideoVideoRef.current;
          if (v) {
            v.pause();
            v.srcObject = null;
          }
        }
        fullscreenStreamRef.current = null;
        fullscreenSocketIdRef.current = null;
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!document.fullscreenElement || !fullscreenSocketIdRef.current) return;

    const video = screenShareVideoRef.current || memberVideoVideoRef.current;
    if (!video) return;

    const streamEntry = remoteStreams.find((s) => s.socketId === fullscreenSocketIdRef.current);

    if (!streamEntry?.stream) {
      if (video.srcObject && !fullscreenStreamRef.current) return;
      return;
    }

    const currentStream = streamEntry.stream;

    if (!video.srcObject) {
      video.srcObject = currentStream;
      fullscreenStreamRef.current = currentStream;
      video.play?.().catch(() => { });
    } else if (fullscreenStreamRef.current && fullscreenStreamRef.current !== currentStream) {
      const oldTracks = fullscreenStreamRef.current.getVideoTracks() || [];
      const newTracks = currentStream.getVideoTracks() || [];
      const trackIdsChanged = oldTracks.length !== newTracks.length ||
        oldTracks.some((t, i) => t.id !== newTracks[i]?.id);

      if (trackIdsChanged) {
        video.srcObject = currentStream;
        fullscreenStreamRef.current = currentStream;
        video.play?.().catch(() => { });
      }
    }
  }, [remoteStreams]);

  useEffect(() => {
    const sid = fullscreenSocketIdRef.current;
    if (!sid || !document.fullscreenElement) return;
    const video = screenShareVideoRef.current || memberVideoVideoRef.current;
    if (!video) return;
    video.muted = !!localParticipantAudioMuted[sid];
    video.volume = localParticipantVolume[sid] ?? 1;
  }, [localParticipantAudioMuted, localParticipantVolume]);

  return {
    screenShareFullscreenRef,
    memberVideoFullscreenRef,
    screenShareVideoRef,
    memberVideoVideoRef,
    toggleFullscreenForScreenShare,
    toggleFullscreenForMember,
  };
}
