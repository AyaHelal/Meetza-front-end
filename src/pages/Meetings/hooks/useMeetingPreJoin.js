import { useState, useRef, useCallback, useEffect } from "react";
import * as webrtcService from "../../../services/webrtcService";

/**
 * Pre-join modal state and handlers. Requests camera/mic when modal opens; cleanup on close.
 * @param {() => void} onEnterMeeting - (stream, videoMuted, audioMuted) => void; called when user clicks Enter
 * @param {() => void} [onDismiss] - called when user closes the modal without entering (Cancel / overlay)
 * @returns {{
 *   showPreJoinModal: boolean,
 *   setShowPreJoinModal: (v: boolean) => void,
 *   preJoinStream: MediaStream | null,
 *   preJoinVideoMuted: boolean,
 *   preJoinAudioMuted: boolean,
 *   preJoinLoading: boolean,
 *   preJoinError: string | null,
 *   preJoinVideoRef: React.RefObject,
 *   handlePreJoinClose: () => void,
 *   handlePreJoinToggleVideo: () => void,
 *   handlePreJoinToggleAudio: () => void,
 *   handlePreJoinEnter: () => void,
 *   clearPreJoinError: () => void,
 * }}
 */
export function useMeetingPreJoin(onEnterMeeting, onDismiss) {
  const [showPreJoinModal, setShowPreJoinModal] = useState(false);
  const [preJoinStream, setPreJoinStream] = useState(null);
  const [preJoinVideoMuted, setPreJoinVideoMuted] = useState(false);
  const [preJoinAudioMuted, setPreJoinAudioMuted] = useState(false);
  const [preJoinLoading, setPreJoinLoading] = useState(false);
  const [preJoinError, setPreJoinError] = useState(null);
  const preJoinVideoRef = useRef(null);
  /** Bumps on each pre-join open cycle so Strict Mode / rapid re-runs do not apply a stale getUserMedia result twice. */
  const mediaRequestCycleRef = useRef(0);

  useEffect(() => {
    if (!showPreJoinModal || preJoinStream || preJoinError) return;
    const cycle = ++mediaRequestCycleRef.current;
    let cancelled = false;
    setPreJoinLoading(true);
    webrtcService
      .getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      .then((stream) => {
        if (cancelled || cycle !== mediaRequestCycleRef.current) {
          webrtcService.stopAllTracks(stream);
          return;
        }
        const hasVideo = stream.getVideoTracks().length > 0;
        setPreJoinStream(stream);
        setPreJoinVideoMuted(!hasVideo);
        setPreJoinAudioMuted(false);
        setPreJoinLoading(false);
      })
      .catch((err) => {
        // Fallback: Try audio only if video failed (e.g., no camera attached)
        webrtcService
          .getUserMedia({
            video: false,
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          })
          .then((audioStream) => {
            if (cancelled || cycle !== mediaRequestCycleRef.current) {
              webrtcService.stopAllTracks(audioStream);
              return;
            }
            setPreJoinStream(audioStream);
            setPreJoinVideoMuted(true);
            setPreJoinAudioMuted(false);
            setPreJoinLoading(false);
          })
          .catch((audioErr) => {
            if (!cancelled && cycle === mediaRequestCycleRef.current) {
              setPreJoinError(err.message || audioErr.message || "Could not access camera/microphone.");
              setPreJoinLoading(false);
            }
          });
      });
    return () => {
      cancelled = true;
    };
  }, [showPreJoinModal, preJoinStream, preJoinError]);

  useEffect(() => {
    const el = preJoinVideoRef.current;
    const stream = preJoinStream;
    if (!el || !stream) return;
    el.srcObject = stream;
    return () => {
      el.srcObject = null;
    };
  }, [preJoinStream]);

  const handlePreJoinClose = useCallback(() => {
    if (preJoinStream) {
      webrtcService.stopAllTracks(preJoinStream);
      setPreJoinStream(null);
    }
    setShowPreJoinModal(false);
    setPreJoinError(null);
    setPreJoinLoading(false);
    if (typeof onDismiss === "function") onDismiss();
  }, [preJoinStream, onDismiss]);

  const handlePreJoinToggleVideo = useCallback(() => {
    setPreJoinVideoMuted((v) => {
      const next = !v;
      if (preJoinStream) {
        const vt = preJoinStream.getVideoTracks()[0];
        if (vt) vt.enabled = next;
      }
      return next;
    });
  }, [preJoinStream]);

  const handlePreJoinToggleAudio = useCallback(() => {
    setPreJoinAudioMuted((v) => {
      const next = !v;
      if (preJoinStream) {
        preJoinStream.getAudioTracks().forEach((t) => (t.enabled = !next));
      }
      return next;
    });
  }, [preJoinStream]);

  const handlePreJoinEnter = useCallback(() => {
    if (!preJoinStream || typeof onEnterMeeting !== "function") return;
    onEnterMeeting(preJoinStream, preJoinVideoMuted, preJoinAudioMuted);
    setShowPreJoinModal(false);
    setPreJoinStream(null);
  }, [preJoinStream, preJoinVideoMuted, preJoinAudioMuted, onEnterMeeting]);

  const clearPreJoinError = useCallback(() => setPreJoinError(null), []);

  return {
    showPreJoinModal,
    setShowPreJoinModal,
    preJoinStream,
    preJoinVideoMuted,
    preJoinAudioMuted,
    preJoinLoading,
    preJoinError,
    preJoinVideoRef,
    handlePreJoinClose,
    handlePreJoinToggleVideo,
    handlePreJoinToggleAudio,
    handlePreJoinEnter,
    clearPreJoinError,
  };
}
