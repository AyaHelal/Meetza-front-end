import { isScreenShareVideoTrack, getCameraTrack } from "./meetingRoomUtils";

/** Add local tracks to all existing peer connections and renegotiate if needed. */
export function addTracksToAllPeersImpl(opts) {
  const { localStreamRef, peersRef, makingOfferRef, meetingIdRef, socket } = opts;
  const stream = localStreamRef.current;
  if (!stream) return;

  for (const [peerSocketId, pc] of peersRef.current.entries()) {
    if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer" && pc.signalingState !== "have-remote-offer") {
      console.log("⏸️ Skipping track addition for", peerSocketId, "- connection is negotiating (state:", pc.signalingState + ")");
      continue;
    }
    const senders = pc.getSenders();
    const hasVideo = senders.some((s) => s.track && s.track.kind === "video");
    const hasAudio = senders.some((s) => s.track && s.track.kind === "audio");
    const streamHasVideo = stream.getVideoTracks().length > 0;
    const streamHasAudio = stream.getAudioTracks().length > 0;
    const needsVideo = streamHasVideo && !hasVideo;
    const needsAudio = streamHasAudio && !hasAudio;

    if (needsVideo || needsAudio) {
      console.log("🔄 Adding missing tracks to peer", peerSocketId, { needsVideo, needsAudio });
      let addedAny = false;
      stream.getTracks().forEach((t) => {
        const existing = senders.find((s) => s.track && s.track.kind === t.kind);
        if (!existing) {
          try {
            pc.addTrack(t, stream);
            console.log("➕ Added track to peer", peerSocketId, { kind: t.kind, enabled: t.enabled });
            addedAny = true;
          } catch (err) {
            console.warn("⚠️ Failed to add track to peer", peerSocketId, ":", err);
          }
        }
      });
      if (addedAny && pc.signalingState === "stable" && !makingOfferRef.current) {
        setTimeout(() => {
          if (pc.signalingState === "stable" && !makingOfferRef.current) {
            pc.createOffer()
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                const mid = meetingIdRef.current;
                if (socket && mid) {
                  socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: pc.localDescription }, () => { });
                  console.log("📤 Renegotiated after adding tracks to", peerSocketId);
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
}

/** Get or create local stream with at least muted audio for WebRTC negotiation. */
export async function ensureLocalMediaImpl(opts) {
  const { localStreamRef, setLocalStream } = opts;
  if (localStreamRef.current) {
    const stream = localStreamRef.current;
    if (stream.getTracks().length === 0) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        mediaStream.getAudioTracks().forEach((t) => {
          t.enabled = false;
          stream.addTrack(t);
        });
        console.log("✅ Added muted audio track for WebRTC negotiation");
      } catch (e) {
        console.warn("⚠️ Could not get audio track for negotiation:", e);
      }
    }
    return stream;
  }
  const stream = new MediaStream();
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    mediaStream.getAudioTracks().forEach((t) => {
      t.enabled = false;
      stream.addTrack(t);
    });
    console.log("✅ Added muted audio track for WebRTC negotiation");
  } catch (e) {
    console.warn("⚠️ Could not get audio track for negotiation:", e);
  }
  localStreamRef.current = stream;
  setLocalStream(stream);
  console.log("✅ Created local stream with muted audio for negotiation");
  return stream;
}

/** Create and send WebRTC offer to target peer. */
export async function createAndSendOfferImpl(opts, targetSocketId) {
  const { peersRef, localStreamRef, makingOfferRef, meetingIdRef, socket, ensureLocalMedia } = opts;
  const pc = peersRef.current.get(targetSocketId);
  if (!pc) {
    console.warn("⚠️ Cannot create offer - no peer connection for", targetSocketId);
    return;
  }
  try {
    makingOfferRef.current = true;
    console.log("📤 Creating offer for", targetSocketId);
    let stream = localStreamRef.current;
    if (!stream || stream.getTracks().length === 0) {
      console.log("🔄 Ensuring local media has tracks before creating offer...");
      try {
        await ensureLocalMedia();
        stream = localStreamRef.current;
      } catch (e) {
        console.error("❌ Failed to ensure local media:", e);
      }
    }
    if (stream) {
      stream.getTracks().forEach((t) => {
        const existing = pc.getSenders().find((s) => s.track && s.track.kind === t.kind);
        if (!existing) {
          console.log("➕ Adding track to peer connection before offer:", { kind: t.kind, enabled: t.enabled });
          pc.addTrack(t, stream);
        }
      });
    } else {
      console.warn("⚠️ No local stream available - offer may fail");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const mid = meetingIdRef.current;
    socket.emit("webrtcOffer", { toSocketId: targetSocketId, meetingId: mid, sdp: offer }, (ack) => {
      if (ack && !ack.ok) {
        console.error("❌ Offer send failed:", ack);
      } else {
        console.log("✅ Offer sent successfully to", targetSocketId);
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      if (hasAudio && !hasEnabledAudio) {
        for (const [, pc] of peersRef.current.entries()) {
          const audioSenders = pc.getSenders().filter((s) => s.track && s.track.kind === "audio");
          audioSenders.forEach((sender) => {
            try {
              sender.track.stop();
              pc.removeTrack(sender);
              console.log("🗑️ Removed old audio track from peer connection");
            } catch (err) {
              console.error("❌ Error removing old audio track:", err);
            }
          });
        }
        audioTracks.forEach((t) => {
          t.stop();
          stream.removeTrack(t);
        });
        console.log("🗑️ Removed disabled audio tracks before adding new ones");
      }
      mediaStream.getAudioTracks().forEach((t) => {
        t.enabled = true;
        stream.addTrack(t);
        console.log("✅ Added enabled audio track to stream");
      });
    } catch (e) {
      console.error("getUserMedia failed for audio:", e);
      throw e;
    }
  }

  if (needVideo && !hasCamera) {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
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
  if (needAudio && (!hasAudio || !hasEnabledAudio)) {
    setTimeout(() => addTracksToAllPeers(), 100);
  }
  return stream;
}

/**
 * Creates an RTCPeerConnection for the given peer, sets up event handlers, adds local tracks, registers with MediaContext.
 * @param {string} peerSocketId
 * @param {object} opts - { socket, meetingIdRef, localStreamRef, politeRef, createAndSendOfferRef, upsertRemoteStream, registerPeerConnection, setMediaStateMap, setRemoteStreams }
 * @returns {RTCPeerConnection}
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

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    if (!socket) return;
    const mid = meetingIdRef.current;
    if (!mid) return;
    socket.emit(
      "webrtcIceCandidate",
      { toSocketId: peerSocketId, meetingId: mid, candidate: event.candidate },
      () => { }
    );
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    console.log(`🔗 Peer connection state changed for ${peerSocketId}:`, state);

    if (state === "failed" || state === "disconnected") {
      console.warn(`⚠️ Connection ${state} for ${peerSocketId}, attempting to recover...`);
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
      console.log(`✅ Connection established with ${peerSocketId}`);
    }
  };

  pc.oniceconnectionstatechange = () => {
    const iceState = pc.iceConnectionState;
    console.log(`🧊 ICE connection state for ${peerSocketId}:`, iceState);

    if (iceState === "failed" || iceState === "disconnected") {
      console.warn(`⚠️ ICE connection ${iceState} for ${peerSocketId}`);
      if (iceState === "failed") {
        try {
          pc.restartIce();
          console.log("🔄 Restarted ICE for", peerSocketId);
        } catch (err) {
          console.error("❌ Failed to restart ICE:", err);
        }
      }
    }
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams || [];
    if (stream) {
      console.log("📥 Received track from", peerSocketId, {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
        audioTrackEnabled: stream.getAudioTracks()[0]?.enabled,
      });

      const vt = stream.getVideoTracks()[0];
      const isScreenShare = vt && isScreenShareVideoTrack(vt);
      upsertRemoteStream(peerSocketId, stream, isScreenShare);

      if (vt && !isScreenShare && vt.enabled && vt.readyState === "live") {
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
          console.warn(`⚠️ Track ended for ${peerSocketId}:`, track.kind);
          if (stream.getTracks().every((t) => t.readyState === "ended")) {
            setRemoteStreams((prev) => prev.filter((s) => s.socketId !== peerSocketId));
          }
        };
        track.onmute = () => {
          console.log(`🔇 Track muted for ${peerSocketId}:`, track.kind);
          if (track.kind === "video") {
            setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], videoMuted: true } }));
          } else if (track.kind === "audio") {
            setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], audioMuted: true } }));
          }
        };
        track.onunmute = () => {
          console.log(`🔊 Track unmuted for ${peerSocketId}:`, track.kind);
          if (track.kind === "video") {
            setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], videoMuted: false } }));
          } else if (track.kind === "audio") {
            setMediaStateMap((prev) => ({ ...prev, [peerSocketId]: { ...prev[peerSocketId], audioMuted: false } }));
          }
        };
      });
    }
  };

  const stream = localStreamRef.current;
  if (stream) {
    stream.getTracks().forEach((t) => {
      if (t.kind === "video" && !t.enabled) {
        console.log("⚠️ Adding disabled video track to peer", peerSocketId, "- will show black until enabled");
      }
      console.log("➕ Adding local track to peer", peerSocketId, { kind: t.kind, enabled: t.enabled });
      pc.addTrack(t, stream);
    });
  } else {
    console.warn("⚠️ Local stream not ready when creating peer connection for", peerSocketId);
  }

  registerPeerConnection(peerSocketId, pc);

  return pc;
}
