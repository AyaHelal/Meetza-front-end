import { useEffect } from "react";
import { toParticipant } from "../components/meetingRoomUtils";
import * as webrtcService from "../../../services/webrtcService";
import * as meetingSocketService from "../services/meetingSocketService";

/**
 * Sets up socket listeners for meeting room (participants, WebRTC signaling, hand raised, media state, reactions).
 * Call this hook after createPeerConnection, createAndSendOffer, ensureLocalMedia, closePeer, addReactionToMap, spawnFloatingEmojis, getReactionIcon, and selfMemberId are defined.
 */
export function useMeetingRoomSocketListeners({
  socket,
  meetingIdRef,
  peersRef,
  peerMetaRef,
  politeRef,
  makingOfferRef,
  iceQueueRef,
  setParticipants,
  setHandRaisedMap,
  setReactionsMap,
  setMediaStateMap,
  setRemoteStreams,
  toParticipant: toParticipantFn,
  localStreamRef,
  ensureLocalMedia,
  createPeerConnection,
  createAndSendOffer,
  closePeer,
  getReactionIcon,
  addReactionToMap,
  spawnFloatingEmojis,
  selfMemberId,
  setAudioMuted,
  setContextAudioMuted,
  setLocalParticipantAudioMuted,
  getVideoMuted,
}) {
  const toP = toParticipantFn || toParticipant;

  useEffect(() => {
    if (!socket) return;

    // FIX: Helper to wait until localStreamRef has live tracks before proceeding.
    // This is the core fix for "first join requires refresh" - we must not create
    // peer connections or send offers until the browser has fully initialized media.
    const waitForLocalStream = async (timeoutMs = 3000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const stream = localStreamRef.current;
        if (stream && stream.getTracks().some(t => t.readyState === "live")) {
          return stream;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      return localStreamRef.current;
    };

    const onParticipantJoined = async (data) => {
      const peerSocketId = data?.socketId || data?.id || data?.fromSocketId;
      const mid = data?.meetingId;
      if (!peerSocketId || !mid) {
        return;
      }
      if (mid !== meetingIdRef.current) {
        return;
      }
      if (peerSocketId === socket.id) {
        return;
      }
      if (peersRef.current.has(peerSocketId)) {
        return;
      }
      const entry = toP({
        socketId: peerSocketId,
        member_id: data?.userId ?? data?.user_id ?? data?.member_id,
        member_name: data?.name ?? data?.member_name,
        member_photo: data?.user_photo ?? data?.member_photo,
        member_email: data?.email ?? data?.member_email,
      });
      setParticipants((prev) => {
        if (prev.some((p) => (p?.socketId || p?.id) === peerSocketId)) return prev;
        return [...prev, entry];
      });

      const meta = { member_id: entry.member_id, member_name: entry.member_name, member_photo: entry.member_photo, member_email: entry.member_email };
      peerMetaRef.current.set(peerSocketId, meta);

      // FIX: Ensure local media exists first
      let stream = localStreamRef.current;
      if (!stream || stream.getTracks().length === 0) {
        try {
          await ensureLocalMedia();
          stream = localStreamRef.current;
        } catch (e) {
          console.error("❌ Failed to ensure local media:", e);
        }
      }

      // FIX: Wait for live tracks - this prevents sending offers before media is ready.
      // Without this wait, createPeerConnection adds tracks that aren't live yet,
      // and the remote peer receives an offer with no usable tracks.
      await waitForLocalStream(2000);

      const pc = createPeerConnection(peerSocketId);
      peersRef.current.set(peerSocketId, pc);

      if (socket.id < peerSocketId) {
        politeRef.current.set(peerSocketId, false);
        await createAndSendOffer(peerSocketId);
      } else {
        politeRef.current.set(peerSocketId, true);
      }
    };

    const onParticipantLeft = (data) => {
      const peerSocketId = data?.socketId || data?.id || data?.fromSocketId;
      const mid = data?.meetingId;
      if (!peerSocketId || !mid) return;
      if (mid !== meetingIdRef.current) return;
      const meta = peerMetaRef.current.get(peerSocketId);
      const memberId = meta?.member_id || data?.userId || data?.user_id;
      setParticipants((prev) => prev.filter((p) => (p?.socketId || p?.id) !== peerSocketId));
      setHandRaisedMap((m) => {
        const n = { ...m };
        delete n[peerSocketId];
        const currentMeetingId = meetingIdRef.current;
        if (currentMeetingId) {
          try {
            localStorage.setItem(`meeting_handRaised_${currentMeetingId}`, JSON.stringify(n));
          } catch (error) {
          }
        }
        return n;
      });
      setReactionsMap((m) => {
        const n = { ...m };
        [peerSocketId, memberId].filter(Boolean).forEach((k) => delete n[String(k)]);
        return n;
      });
      setMediaStateMap((m) => { const n = { ...m }; delete n[peerSocketId]; return n; });
      peerMetaRef.current.delete(peerSocketId);
      closePeer(peerSocketId);
    };

    const onWebrtcOffer = async (data) => {
      const fromSocketId = data?.fromSocketId || data?.socketId || data?.from;
      const mid = data?.meetingId;
      const sdp = data?.sdp || data?.offer;
      if (!fromSocketId || !mid || !sdp) {
        return;
      }
      if (mid !== meetingIdRef.current) {
        return;
      }

      let pc = peersRef.current.get(fromSocketId);
      if (!pc) {

        // FIX: Wait for local stream before creating the peer connection when receiving an offer.
        // If we're the polite peer (waiting for offers), we still need live local tracks
        // so that when we answer, our tracks are included correctly.
        await waitForLocalStream(2000);

        pc = createPeerConnection(fromSocketId);
        peersRef.current.set(fromSocketId, pc);
        if (socket.id < fromSocketId) {
          politeRef.current.set(fromSocketId, false);
        } else {
          politeRef.current.set(fromSocketId, true);
        }
      }

      const isPolite = politeRef.current.get(fromSocketId) ?? true;
      const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
      const ignoreOffer = !isPolite && offerCollision;

      if (ignoreOffer) {
        return;
      }

      try {
        // Add our local tracks to the peer connection before answering, so the answer includes our stream (camera/screen/audio).
        // Without this, when we're the "polite" peer we'd send an answer with no tracks and the other side would never see our video/screen.
        const stream = localStreamRef.current;
        if (stream && stream.getTracks().length > 0) {
          const senders = pc.getSenders();
          for (const track of stream.getTracks()) {
            const existing = senders.find((s) => s.track && s.track.kind === track.kind);
            if (!existing) {
              try {
                webrtcService.addTrack(pc, track, stream);
              } catch (err) {
              }
            }
          }
        }

        await webrtcService.setRemoteDescription(pc, sdp);

        const queue = iceQueueRef.current.get(fromSocketId);
        if (queue && queue.length > 0) {
          for (const candidate of queue) {
            try {
              await webrtcService.addIceCandidate(pc, candidate);
            } catch (err) {
              if (err.name !== "OperationError" || !err.message?.includes("already exists")) {
              }
            }
          }
          iceQueueRef.current.delete(fromSocketId);
        }

        const answer = await webrtcService.createAnswer(pc);
        await webrtcService.setLocalDescription(pc, answer);
        meetingSocketService.sendWebrtcAnswer(socket, mid, fromSocketId, answer, (ack) => {
          if (ack && !ack.ok) {
            console.error("❌ Answer send failed:", ack);
          } else {
          }
        });
      } catch (err) {
        console.error("❌ Error handling offer:", err, "for", fromSocketId);
      }
    };

    const onWebrtcAnswer = async (data) => {
      const fromSocketId = data?.fromSocketId || data?.socketId || data?.from;
      const mid = data?.meetingId;
      const sdp = data?.sdp;
      if (!fromSocketId || !mid || !sdp) return;
      if (mid !== meetingIdRef.current) return;

      let pc = peersRef.current.get(fromSocketId);
      if (!pc) {
        return;
      }

      try {
        const currentState = pc.signalingState;

        if (currentState === "have-local-offer") {
          await webrtcService.setRemoteDescription(pc, sdp);

          const queue = iceQueueRef.current.get(fromSocketId);
          if (queue && queue.length > 0) {
            for (const candidate of queue) {
              try {
                await webrtcService.addIceCandidate(pc, candidate);
              } catch (err) {
                if (err.name !== "OperationError" || !err.message?.includes("already exists")) {
                }
              }
            }
            iceQueueRef.current.delete(fromSocketId);
          }
        } else if (currentState === "stable") {
        } else {
        }
      } catch (err) {
        if (err.name === "InvalidStateError" && pc.connectionState !== "new") {
        } else {
          console.error("❌ Error setting remote answer:", err, "for", fromSocketId);
        }
      }
    };

    const onIceCandidate = async (data) => {
      const fromSocketId = data?.fromSocketId || data?.socketId || data?.from;
      const mid = data?.meetingId;
      const candidate = data?.candidate;
      if (!fromSocketId || !mid || !candidate) return;
      if (mid !== meetingIdRef.current) return;

      let pc = peersRef.current.get(fromSocketId);
      if (!pc) {
        if (!iceQueueRef.current.has(fromSocketId)) {
          iceQueueRef.current.set(fromSocketId, []);
        }
        iceQueueRef.current.get(fromSocketId).push(candidate);
        return;
      }

      if (!pc.remoteDescription) {
        if (!iceQueueRef.current.has(fromSocketId)) {
          iceQueueRef.current.set(fromSocketId, []);
        }
        iceQueueRef.current.get(fromSocketId).push(candidate);
        return;
      }

      try {
        await webrtcService.addIceCandidate(pc, candidate);
      } catch (err) {
        if (err.name === "InvalidStateError" && pc.connectionState !== "new") {
        } else if (err.name === "OperationError" && err.message?.includes("already exists")) {
        } else {
          console.error("❌ Error adding ICE candidate:", err, "for", fromSocketId);
        }
      }
    };


    socket.on("participantJoined", onParticipantJoined);
    socket.on("participantLeft", onParticipantLeft);

    const onHandRaised = (data) => {
      const sid = data?.socketId || data?.id;
      const mid = data?.meetingId;
      const raised = data?.raised !== false;
      if (!sid || !mid || mid !== meetingIdRef.current) return;
      setHandRaisedMap((m) => {
        const next = { ...m, [sid]: raised };
        const currentMeetingId = meetingIdRef.current;
        if (currentMeetingId) {
          try {
            localStorage.setItem(`meeting_handRaised_${currentMeetingId}`, JSON.stringify(next));
          } catch (error) {
          }
        }
        return next;
      });
    };
    const onMediaStateUpdated = (data) => {
      const sid = data?.socketId || data?.id;
      const mid = data?.meetingId;
      if (!sid || !mid || mid !== meetingIdRef.current) return;
      setMediaStateMap((m) => ({
        ...m,
        [sid]: {
          ...(m[sid] || {}),
          ...(data.audioMuted !== undefined && { audioMuted: !!data.audioMuted }),
          ...(data.videoMuted !== undefined && { videoMuted: !!data.videoMuted }),
        },
      }));
      // When admin muted us: show mic as muted in control bar + participants list and disable our audio tracks
      if (sid === socket.id && setAudioMuted && setContextAudioMuted && setLocalParticipantAudioMuted) {
        if (data.audioMuted !== undefined) {
          const muted = !!data.audioMuted;
          setAudioMuted(muted);
          setContextAudioMuted(muted);
          setLocalParticipantAudioMuted((prev) => ({ ...prev, [socket.id]: muted }));
          const stream = localStreamRef.current;
          if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
        }
      }
    };

    socket.on("webrtcOffer", onWebrtcOffer);
    socket.on("webrtcAnswer", onWebrtcAnswer);
    socket.on("webrtcIceCandidate", onIceCandidate);
    socket.on("handRaised", onHandRaised);
    socket.on("mediaStateUpdated", onMediaStateUpdated);

    // Admin muted/unmuted this participant — apply real mic mute (track + state + broadcast)
    const onAdminSetYourAudio = (data) => {
      const mid = data?.meetingId;
      if (!mid || mid !== meetingIdRef.current) return;
      const muted = !!data.audioMuted;
      if (setAudioMuted) setAudioMuted(muted);
      if (setContextAudioMuted) setContextAudioMuted(muted);
      const stream = localStreamRef?.current;
      if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
      const videoMuted = typeof getVideoMuted === "function" ? getVideoMuted() : undefined;
      meetingSocketService.updateMediaState(socket, mid, muted, videoMuted);
    };
    socket.on("adminSetYourAudio", onAdminSetYourAudio);

    const onReaction = (data) => {
      try {
        const mid = data?.meetingId;
        if (!mid || mid !== meetingIdRef.current) return;
        const type = data?.type || data?.reaction || "like";
        const fromSocketId = data?.socketId || data?.fromSocketId || data?.from;
        const fromMemberId = data?.userId ?? data?.user_id ?? data?.member_id;

        if (fromSocketId === socket.id || (selfMemberId && String(fromMemberId) === String(selfMemberId))) {
          return;
        }

        const meta = fromSocketId ? peerMetaRef.current.get(fromSocketId) : null;
        const fromName = data?.name ?? data?.member_name ?? meta?.member_name ?? "Someone";
        const key = String(fromMemberId || fromSocketId || fromName);
        addReactionToMap(key, type, fromName);

        const emojiChar = getReactionIcon(type);
        spawnFloatingEmojis(emojiChar, fromName, 1);
      } catch (e) {
        console.error("❌ Error handling reaction event:", e, data);
      }
    };
    socket.on("reaction", onReaction);
    socket.on("meetingReaction", onReaction);
    socket.on("reactionReceived", onReaction);

    const onScreenShareStarted = () => {
      // Screen entry is added when we receive the track in ontrack; no need to update state here
    };
    const onScreenShareStopped = (data) => {
      const sid = data?.socketId || data?.id;
      const mid = data?.meetingId;
      if (!sid || !mid || mid !== meetingIdRef.current || !setRemoteStreams) return;
      setRemoteStreams((prev) => prev.filter((s) => !(s.socketId === sid && s.isScreenShare)));
    };
    socket.on("screenShareStarted", onScreenShareStarted);
    socket.on("screenShareStopped", onScreenShareStopped);

    return () => {
      socket.off("participantJoined", onParticipantJoined);
      socket.off("participantLeft", onParticipantLeft);
      socket.off("webrtcOffer", onWebrtcOffer);
      socket.off("webrtcAnswer", onWebrtcAnswer);
      socket.off("webrtcIceCandidate", onIceCandidate);
      socket.off("handRaised", onHandRaised);
      socket.off("mediaStateUpdated", onMediaStateUpdated);
      socket.off("adminSetYourAudio", onAdminSetYourAudio);
      socket.off("reaction", onReaction);
      socket.off("meetingReaction", onReaction);
      socket.off("reactionReceived", onReaction);
      socket.off("screenShareStarted", onScreenShareStarted);
      socket.off("screenShareStopped", onScreenShareStopped);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePeer, createPeerConnection, socket, createAndSendOffer, ensureLocalMedia]);
}