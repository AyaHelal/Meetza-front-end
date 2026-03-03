/**
 * Meeting media service – audio/video/screen track management. Pure functions; no React.
 */
import * as webrtcService from "../../../services/webrtcService";
import { getCameraTrack } from "../components/meetingRoomUtils";

const AUDIO_CONSTRAINTS = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
};

const VIDEO_CONSTRAINTS = {
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
  audio: false,
};

const DISPLAY_MEDIA_CONSTRAINTS = {
  video: { displaySurface: "monitor", width: { ideal: 1920 }, height: { ideal: 1080 } },
  audio: true,
};

export async function ensureLocalMedia(opts) {
  const { localStreamRef, setLocalStream } = opts;
  if (localStreamRef.current) {
    const stream = localStreamRef.current;
    if (stream.getTracks().length === 0) {
      try {
        const mediaStream = await webrtcService.getUserMedia(AUDIO_CONSTRAINTS);
        mediaStream.getAudioTracks().forEach((t) => {
          t.enabled = false;
          stream.addTrack(t);
        });
      } catch (e) {
        console.warn("Could not get audio track for negotiation:", e);
      }
    }
    return stream;
  }
  const stream = webrtcService.createEmptyStream();
  try {
    const mediaStream = await webrtcService.getUserMedia(AUDIO_CONSTRAINTS);
    mediaStream.getAudioTracks().forEach((t) => {
      t.enabled = false;
      stream.addTrack(t);
    });
  } catch (e) {
    console.warn("Could not get audio track for negotiation:", e);
  }
  localStreamRef.current = stream;
  setLocalStream(stream);
  return stream;
}

export async function ensureMediaTracks(opts, options = {}) {
  const {
    localStreamRef,
    peersRef,
    cameraVideoTrackRef,
    setLocalStream,
    addTracksToAllPeers,
    ensureLocalMedia: ensureLocalMediaFn,
    audioMuted,
    videoMuted,
  } = opts;
  const needAudio = options.needAudio ?? !audioMuted;
  const needVideo = options.needVideo ?? !videoMuted;
  let stream = localStreamRef.current;
  if (!stream) stream = await ensureLocalMediaFn();

  const audioTracks = stream.getAudioTracks();
  const hasEnabledAudio = audioTracks.some((t) => t.enabled && t.readyState === "live");
  const hasAudio = audioTracks.length > 0;
  const hasCamera = !!getCameraTrack(stream);

  if (needAudio && (!hasAudio || !hasEnabledAudio)) {
    if (hasAudio && !hasEnabledAudio) {
      for (const [, pc] of peersRef.current.entries()) {
        const audioSenders = pc.getSenders().filter((s) => s.track && s.track.kind === "audio");
        audioSenders.forEach((sender) => webrtcService.removeTrack(pc, sender, true));
      }
      audioTracks.forEach((t) => {
        t.stop();
        stream.removeTrack(t);
      });
    }
    const mediaStream = await webrtcService.getUserMedia(AUDIO_CONSTRAINTS);
    mediaStream.getAudioTracks().forEach((t) => {
      t.enabled = true;
      stream.addTrack(t);
    });
    setTimeout(() => addTracksToAllPeers(), 100);
  }

  if (needVideo && !hasCamera) {
    const mediaStream = await webrtcService.getUserMedia(VIDEO_CONSTRAINTS);
    const vt = mediaStream.getVideoTracks()[0];
    if (vt) {
      vt.enabled = true;
      stream.addTrack(vt);
      cameraVideoTrackRef.current = vt;
    }
  }

  setLocalStream(stream);
  return stream;
}

export async function getDisplayMediaForScreen() {
  const displayStream = await navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_CONSTRAINTS);
  const screenTrack = displayStream.getVideoTracks()?.[0];
  if (!screenTrack) throw new Error("No video track from getDisplayMedia");
  return { stream: displayStream, screenTrack };
}
