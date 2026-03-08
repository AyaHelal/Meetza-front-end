/**
 * Meeting RTC service – peer connection lifecycle. Pure functions; no React.
 */
import * as webrtcService from "../../../services/webrtcService";
import * as meetingSocketService from "./meetingSocketService";
import { isScreenShareVideoTrack, isScreenShareStream } from "../components/meetingRoomUtils";

export function addTracksToAllPeers(opts) {
  const { localStreamRef, peersRef, makingOfferRef, meetingIdRef, socket } = opts;
  const stream = localStreamRef.current;
  if (!stream) return;
  const audioTracks = stream.getAudioTracks();

  for (const [peerSocketId, pc] of peersRef.current.entries()) {
    if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer" && pc.signalingState !== "have-remote-offer") continue;
    const senders = pc.getSenders();
    let addedAny = false;
    stream.getTracks().forEach((t) => {
      const existing = senders.find((s) => s.track === t);
      if (!existing) {
        try {
          const trackStream = new MediaStream([t, ...audioTracks]);
          webrtcService.addTrack(pc, t, trackStream);
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
              if (socket && mid) meetingSocketService.sendWebrtcOffer(socket, mid, peerSocketId, pc.localDescription, () => {});
            })
            .catch((err) => { if (err.name !== "InvalidStateError") console.error("Renegotiate error:", err); });
        }
      }, 100);
    }
  }
}

export async function createAndSendOffer(opts, targetSocketId) {
  const { peersRef, localStreamRef, makingOfferRef, meetingIdRef, socket, ensureLocalMedia } = opts;
  const pc = peersRef.current.get(targetSocketId);
  if (!pc) return;
  makingOfferRef.current = true;
  try {
    let stream = localStreamRef.current;
    if (!stream || stream.getTracks().length === 0) {
      await ensureLocalMedia();
      stream = localStreamRef.current;
    }
    await webrtcService.waitForLiveTracks(() => localStreamRef.current, 2000);
    stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => {
        const existing = pc.getSenders().find((s) => s.track && s.track.kind === t.kind);
        if (!existing) webrtcService.addTrack(pc, t, stream);
      });
    }
    await new Promise((r) => setTimeout(r, 100));
    const offer = await webrtcService.createOffer(pc);
    await webrtcService.setLocalDescription(pc, offer);
    const mid = meetingIdRef.current;
    if (socket && mid) meetingSocketService.sendWebrtcOffer(socket, mid, targetSocketId, offer, () => {});
  } finally {
    makingOfferRef.current = false;
  }
}

export function createPeerConnection(peerSocketId, opts) {
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
      if (socket && mid) meetingSocketService.sendIceCandidate(socket, mid, peerSocketId, candidate, () => {});
    },
    onConnectionStateChange: () => {
      const state = pc.connectionState;
      if (state === "failed" || state === "disconnected") {
        const isPolite = politeRef.current.get(peerSocketId);
        if (!isPolite && state === "failed") {
          setTimeout(() => {
            if (createAndSendOfferRef.current) createAndSendOfferRef.current(peerSocketId).catch(() => {});
          }, 1000);
        }
      }
    },
    onIceConnectionStateChange: () => {
      if (pc.iceConnectionState === "failed") webrtcService.restartIce(pc);
    },
    onTrack: (event) => {
      const [stream] = event.streams || [];
      if (!stream) return;
      const isScreenShare = isScreenShareStream(stream);
      upsertRemoteStream(peerSocketId, stream, isScreenShare);
      const liveVt = stream.getVideoTracks().find((t) => t.readyState === "live");
      if (liveVt && !isScreenShare && liveVt.enabled) {
        setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], videoMuted: false } }));
      }
      const at = stream.getAudioTracks()[0];
      if (at && at.enabled && at.readyState === "live") {
        setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], audioMuted: false } }));
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
          if (track.kind === "video") setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], videoMuted: true } }));
          else if (track.kind === "audio") setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], audioMuted: true } }));
        };
        track.onunmute = () => {
          if (track.kind === "video") setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], videoMuted: false } }));
          else if (track.kind === "audio") setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], audioMuted: false } }));
        };
      });
    },
  });

  const stream = localStreamRef.current;
  if (stream) {
    const audioTracks = stream.getAudioTracks();
    const liveTracks = stream.getTracks().filter((t) => t.readyState === "live");
    liveTracks.forEach((t) => {
      const trackStream = new MediaStream([t, ...audioTracks]);
      webrtcService.addTrack(pc, t, trackStream);
    });
  }
  registerPeerConnection(peerSocketId, pc);
  return pc;
}

export function closePeer(peerSocketId, peersRef, unregisterPeerConnection, removeRemoteStream) {
  const pc = peersRef.current.get(peerSocketId);
  if (pc) {
    webrtcService.closePeerConnection(pc);
    peersRef.current.delete(peerSocketId);
    unregisterPeerConnection(peerSocketId);
  }
  removeRemoteStream(peerSocketId);
}
