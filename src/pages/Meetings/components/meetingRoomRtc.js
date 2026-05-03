/**
 * Meeting room WebRTC orchestration – uses webrtcService and meetingSocketService.
 * Same public API as before; business logic delegated to services.
 */
import { isScreenShareVideoTrack, getCameraTrack, isScreenShareStream } from "./meetingRoomUtils";
import * as webrtcService from "../../../services/webrtcService";
import * as meetingSocketService from "../../services/meetingSocketService";

const AUDIO_CONSTRAINTS = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
};
const VIDEO_CONSTRAINTS = {
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
  audio: false,
};

/** Add local tracks to all existing peer connections and renegotiate if needed. */
export function addTracksToAllPeersImpl(opts) {
  const { localStreamRef, peersRef, makingOfferRef, meetingIdRef, socket } = opts;
  const stream = localStreamRef.current;
  if (!stream) return;

  const audioTracks = stream.getAudioTracks();

  for (const [peerSocketId, pc] of peersRef.current.entries()) {
    if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer" && pc.signalingState !== "have-remote-offer") {
      continue;
    }
    const senders = pc.getSenders();
    let addedAny = false;
    stream.getTracks().forEach((t) => {
      const existing = senders.find((s) => s.track === t);
      if (!existing) {
        try {
          webrtcService.addTrack(pc, t, stream);
          addedAny = true;
        } catch (err) {
        }
      }
    });
    if (addedAny && pc.signalingState === "stable" && !makingOfferRef.current) {
      setTimeout(() => {
        if (pc.signalingState === "stable" && !makingOfferRef.current) {
          webrtcService.createOffer(pc)
            .then((offer) => webrtcService.setLocalDescription(pc, offer))
            .then(() => {
              const mid = meetingIdRef.current;
              if (socket && mid) {
                meetingSocketService.sendWebrtcOffer(socket, mid, peerSocketId, pc.localDescription, () => {});
              }
            })
            .catch((err) => {
              if (err.name !== "InvalidStateError") {
                console.error("❌ Error renegotiating after adding tracks:", err);
              }
            });
        }
      }, 100);
    }
  }
}

/** Get or create local stream with at least muted audio for WebRTC negotiation. */
export async function ensureLocalMediaImpl(opts) {
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
  }
  localStreamRef.current = stream;
  setLocalStream(stream);
  return stream;
}

/** Create and send WebRTC offer to target peer. */
export async function createAndSendOfferImpl(opts, targetSocketId) {
  const { peersRef, localStreamRef, makingOfferRef, meetingIdRef, socket, ensureLocalMedia } = opts;
  const pc = peersRef.current.get(targetSocketId);
  if (!pc) {
    return;
  }
  try {
    makingOfferRef.current = true;

    let stream = localStreamRef.current;
    if (!stream || stream.getTracks().length === 0) {
      try {
        await ensureLocalMedia();
        stream = localStreamRef.current;
      } catch (e) {
        console.error("❌ Failed to ensure local media:", e);
      }
    }

    await webrtcService.waitForLiveTracks(() => localStreamRef.current, 2000);
    stream = localStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((t) => {
        const existing = pc.getSenders().find((s) => s.track && s.track.kind === t.kind);
        if (!existing) {
          webrtcService.addTrack(pc, t, stream);
        }
      });
    } else {
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const offer = await webrtcService.createOffer(pc);
    await webrtcService.setLocalDescription(pc, offer);
    const mid = meetingIdRef.current;
    meetingSocketService.sendWebrtcOffer(socket, mid, targetSocketId, offer, (ack) => {
      if (ack && !ack.ok) {
        console.error("❌ Offer send failed:", ack);
      } else {
      }
    });
  } catch (err) {
    console.error("❌ Error creating/sending offer:", err);
  } finally {
    makingOfferRef.current = false;
  }
}

/** Ensure audio/video tracks are in local stream; add to peers if needed. */
export async function ensureMediaTracksImpl(opts, options = {}) {
  const {
    localStreamRef,
    peersRef,
    cameraVideoTrackRef,
    setLocalStream,
    addTracksToAllPeers,
    ensureLocalMedia,
    audioMuted,
    videoMuted,
  } = opts;
  const needAudio = options.needAudio ?? !audioMuted;
  const needVideo = options.needVideo ?? !videoMuted;
  let stream = localStreamRef.current;
  if (!stream) stream = await ensureLocalMedia();

  const audioTracks = stream.getAudioTracks();
  const hasEnabledAudio = audioTracks.some((t) => t.enabled && t.readyState === "live");
  const hasAudio = audioTracks.length > 0;
  const hasCamera = !!getCameraTrack(stream);

  if (needAudio && (!hasAudio || !hasEnabledAudio)) {
    try {
      if (hasAudio && !hasEnabledAudio) {
        for (const [, pc] of peersRef.current.entries()) {
          const audioSenders = pc.getSenders().filter((s) => s.track && s.track.kind === "audio");
          audioSenders.forEach((sender) => {
            webrtcService.removeTrack(pc, sender, true);
          });
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
    } catch (e) {
      console.error("getUserMedia failed for audio:", e);
      throw e;
    }
  }

  if (needVideo && !hasCamera) {
    try {
      const mediaStream = await webrtcService.getUserMedia(VIDEO_CONSTRAINTS);
      const vt = mediaStream.getVideoTracks()[0];
      if (vt) {
        vt.enabled = true;
        stream.addTrack(vt);
        cameraVideoTrackRef.current = vt;
      }
    } catch (e) {
      console.error("getUserMedia failed for video:", e);
      throw e;
    }
  }

  setLocalStream(stream);
  return stream;
}

/**
 * Creates an RTCPeerConnection for the given peer using webrtcService and meetingSocketService.
 */
export function createPeerConnectionImpl(peerSocketId, opts) {
  const {
    socket,
    meetingIdRef,
    localStreamRef,
    politeRef,
    createAndSendOfferRef,
    upsertRemoteStream,
    registerPeerConnection,
    setMediaStateMap,
    setRemoteStreams,
  } = opts;

  const pc = webrtcService.createPeerConnection({
    onIceCandidate: (candidate) => {
      const mid = meetingIdRef.current;
      if (socket && mid) {
        meetingSocketService.sendIceCandidate(socket, mid, peerSocketId, candidate, () => {});
      }
    },
    onConnectionStateChange: () => {
      const state = pc.connectionState;
      if (state === "failed" || state === "disconnected") {
        const isPolite = politeRef.current.get(peerSocketId);
        if (!isPolite && state === "failed") {
          setTimeout(() => {
            if (createAndSendOfferRef.current) {
              createAndSendOfferRef.current(peerSocketId).catch((err) => {
                console.error("❌ Failed to recover connection:", err);
              });
            }
          }, 1000);
        }
      } else if (state === "connected") {
      }
    },
    onIceConnectionStateChange: () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "failed" || iceState === "disconnected") {
        if (iceState === "failed") {
          webrtcService.restartIce(pc);
        }
      }
    },
    onTrack: (event) => {
      const [stream] = event.streams || [];
      if (stream) {

        const isScreenShare = isScreenShareStream(stream);
        upsertRemoteStream(peerSocketId, stream, isScreenShare);
        const liveVt = stream.getVideoTracks().find((t) => t.readyState === "live");

        if (liveVt && !isScreenShare && liveVt.enabled && liveVt.readyState === "live") {
          setMediaStateMap((prev) => ({
            ...prev,
            [peerSocketId]: { ...prev[peerSocketId], videoMuted: false },
          }));
        }

        const at = stream.getAudioTracks()[0];
        if (at && at.enabled && at.readyState === "live") {
          setMediaStateMap((prev) => ({
            ...prev,
            [peerSocketId]: { ...prev[peerSocketId], audioMuted: false },
          }));
        }

        stream.getTracks().forEach((track) => {
          track.onended = () => {
            if (stream.getTracks().every((t) => t.readyState === "ended")) {
              setRemoteStreams((prev) => prev.filter((s) => s.socketId !== peerSocketId));
            } else {
              setRemoteStreams((prev) => prev.filter((s) => !(s.socketId === peerSocketId && s.stream === stream)));
            }
          };
          track.onmute = () => {
            if (track.kind === "video") {
              setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], videoMuted: true } }));
            } else if (track.kind === "audio") {
              setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], audioMuted: true } }));
            }
          };
          track.onunmute = () => {
            if (track.kind === "video") {
              setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], videoMuted: false } }));
            } else if (track.kind === "audio") {
              setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], audioMuted: false } }));
            }
          };
        });
      }
    },
  });

  const stream = localStreamRef.current;
  if (stream) {
    const audioTracks = stream.getAudioTracks();
    const liveTracks = stream.getTracks().filter((t) => t.readyState === "live");
    const pendingTracks = stream.getTracks().filter((t) => t.readyState !== "live");

    if (pendingTracks.length > 0) {
    }

    liveTracks.forEach((t) => {
      if (t.kind === "video" && !t.enabled) {
      }
      webrtcService.addTrack(pc, t, stream);
    });
  } else {
  }

  registerPeerConnection(peerSocketId, pc);

  return pc;
}
