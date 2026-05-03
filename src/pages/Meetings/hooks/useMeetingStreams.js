import { useState, useRef, useCallback, useEffect } from "react";
import * as meetingStreamService from "../services/meetingStreamService";

export function useMeetingStreams(opts) {
  const [remoteStreams, setRemoteStreams] = useState([]);
  const remoteStreamsRef = useRef([]);
  const meetingSpeakerMuted = opts?.meetingSpeakerMuted ?? false;
  const localParticipantAudioMuted = opts?.localParticipantAudioMuted ?? {};
  const localParticipantVolume = opts?.localParticipantVolume ?? {};
  const remoteVideoRefsMap = opts?.remoteVideoRefsMap;

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  const upsertRemoteStream = useCallback((socketId, stream, isScreenShare) => {
    if (!socketId || !stream) return;
    const prev = remoteStreamsRef.current;
    const effectiveIsScreen = meetingStreamService.computeEffectiveIsScreen(prev, socketId, stream, isScreenShare ?? false);

    setRemoteStreams((prevState) =>
      meetingStreamService.upsertRemoteStreamState(prevState, socketId, stream, effectiveIsScreen)
    );

    const videoKey = effectiveIsScreen ? `${socketId}-screen` : socketId;
    setTimeout(() => {
      const map = remoteVideoRefsMap?.current;
      const videoEl = map && typeof map.get === "function" ? map.get(videoKey) : null;
      if (videoEl && stream) {
        if (videoEl.srcObject !== stream) videoEl.srcObject = stream;
        videoEl.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted[socketId];
        videoEl.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume[socketId] ?? 1);
        if (videoEl.paused) videoEl.play().catch(() => {});
      }
    }, 100);
  }, [meetingSpeakerMuted, localParticipantAudioMuted, localParticipantVolume, remoteVideoRefsMap]);

  const removeRemoteStream = useCallback((socketId, isScreenShareOnly) => {
    setRemoteStreams((prev) => meetingStreamService.removeRemoteStreamState(prev, socketId, isScreenShareOnly ?? false));
  }, []);

  return { remoteStreams, setRemoteStreams, remoteStreamsRef, upsertRemoteStream, removeRemoteStream };
}
