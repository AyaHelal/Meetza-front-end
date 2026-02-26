import { useEffect } from "react";
import { toParticipant } from "./meetingRoomUtils";

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
      console.warn("⚠️ waitForLocalStream timed out in socket listener");
      return localStreamRef.current;
    };

    const onParticipantJoined = async (data) => {
      console.log("🎉 participantJoined event received:", data);
      const peerSocketId = data?.socketId || data?.id || data?.fromSocketId;
      const mid = data?.meetingId;
      if (!peerSocketId || !mid) {
        console.warn("⚠️ participantJoined - missing socketId or meetingId", { peerSocketId, mid });
        return;
      }
      if (mid !== meetingIdRef.current) {
        console.warn("⚠️ participantJoined - wrong meeting", { received: mid, current: meetingIdRef.current });
        return;
      }
      if (peerSocketId === socket.id) {
        console.log("ℹ️ participantJoined - ignoring self");
        return;
      }
      if (peersRef.current.has(peerSocketId)) {
        console.log("⚠️ participantJoined - peer already exists for", peerSocketId);
        return;
      }
      const entry = toP({
        socketId: peerSocketId,
        member_id: data?.userId ?? data?.user_id ?? data?.member_id,
        member_name: data?.name ?? data?.member_name,
        member_photo: data?.user_photo ?? data?.member_photo,
        member_email: data?.email ?? data?.member_email,
      });
      console.log("📸 Participant joined with photo:", {
        socketId: peerSocketId,
        name: entry.member_name,
        photo: entry.member_photo,
        rawData: { user_photo: data?.user_photo, member_photo: data?.member_photo }
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
        console.log("🔄 Ensuring local media before creating peer connection for new participant...");
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
      console.log("✅ Local stream ready for new participant connection:", peerSocketId);

      console.log("🔗 Creating peer connection for new participant", peerSocketId);
      const pc = createPeerConnection(peerSocketId);
      peersRef.current.set(peerSocketId, pc);

      if (socket.id < peerSocketId) {
        politeRef.current.set(peerSocketId, false);
        console.log("🔵 We are impolite for new participant", peerSocketId, "(our id is smaller)");
        await createAndSendOffer(peerSocketId);
      } else {
        politeRef.current.set(peerSocketId, true);
        console.log("🟢 We are polite for new participant", peerSocketId, "(their id is smaller)");
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
            console.warn("Failed to save handRaisedMap to localStorage:", error);
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
        console.warn("⚠️ Received invalid offer:", { fromSocketId, mid, hasSdp: !!sdp });
        return;
      }
      if (mid !== meetingIdRef.current) {
        console.warn("⚠️ Received offer for wrong meeting:", { received: mid, current: meetingIdRef.current });
        return;
      }

      let pc = peersRef.current.get(fromSocketId);
      if (!pc) {
        console.log("🔗 Creating peer connection for incoming offer from", fromSocketId);

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
        console.log("⚠️ Ignoring offer due to collision (we are impolite and making offer):", fromSocketId);
        return;
      }

      try {
        console.log("📥 Setting remote offer from", fromSocketId, "state:", pc.signalingState);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const queue = iceQueueRef.current.get(fromSocketId);
        if (queue && queue.length > 0) {
          console.log("🔄 Processing", queue.length, "queued ICE candidates for", fromSocketId);
          for (const candidate of queue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              if (err.name !== "OperationError" || !err.message?.includes("already exists")) {
                console.warn("⚠️ Failed to process queued ICE candidate:", err);
              }
            }
          }
          iceQueueRef.current.delete(fromSocketId);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("📤 Sending answer to", fromSocketId);
        socket.emit(
          "webrtcAnswer",
          { toSocketId: fromSocketId, meetingId: mid, sdp: answer },
          (ack) => {
            if (ack && !ack.ok) {
              console.error("❌ Answer send failed:", ack);
            } else {
              console.log("✅ Answer sent successfully to", fromSocketId);
            }
          }
        );
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

      const pc = peersRef.current.get(fromSocketId);
      if (!pc) {
        console.warn("⚠️ Received answer but no peer connection for", fromSocketId);
        return;
      }

      try {
        const currentState = pc.signalingState;
        const remoteDesc = pc.remoteDescription;

        if (currentState === "have-local-offer") {
          console.log("✅ Setting remote answer for", fromSocketId, "current state:", currentState);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          const queue = iceQueueRef.current.get(fromSocketId);
          if (queue && queue.length > 0) {
            console.log("🔄 Processing", queue.length, "queued ICE candidates for", fromSocketId);
            for (const candidate of queue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                if (err.name !== "OperationError" || !err.message?.includes("already exists")) {
                  console.warn("⚠️ Failed to process queued ICE candidate:", err);
                }
              }
            }
            iceQueueRef.current.delete(fromSocketId);
          }
        } else if (currentState === "stable" && !remoteDesc) {
          console.log("⚠️ Setting remote answer in stable state (no remote desc yet) for", fromSocketId);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          const queue = iceQueueRef.current.get(fromSocketId);
          if (queue && queue.length > 0) {
            console.log("🔄 Processing", queue.length, "queued ICE candidates for", fromSocketId);
            for (const candidate of queue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                if (err.name !== "OperationError" || !err.message?.includes("already exists")) {
                  console.warn("⚠️ Failed to process queued ICE candidate:", err);
                }
              }
            }
            iceQueueRef.current.delete(fromSocketId);
          }
        } else if (currentState === "stable" && remoteDesc) {
          console.log("ℹ️ Ignoring duplicate answer - already have remote description for", fromSocketId);
        } else {
          console.warn("⚠️ Cannot set remote answer - wrong state:", currentState, "for", fromSocketId);
        }
      } catch (err) {
        if (err.name === "InvalidStateError" && pc.connectionState !== "new") {
          console.log("ℹ️ Answer received but connection already established for", fromSocketId);
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

      const pc = peersRef.current.get(fromSocketId);
      if (!pc) {
        console.warn("⚠️ Received ICE candidate but no peer connection for", fromSocketId);
        return;
      }

      if (!pc.remoteDescription) {
        if (!iceQueueRef.current.has(fromSocketId)) {
          iceQueueRef.current.set(fromSocketId, []);
        }
        iceQueueRef.current.get(fromSocketId).push(candidate);
        console.log("📦 Queued ICE candidate for", fromSocketId, "queue size:", iceQueueRef.current.get(fromSocketId).length);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ Added ICE candidate for", fromSocketId);
      } catch (err) {
        if (err.name === "InvalidStateError" && pc.connectionState !== "new") {
          console.log("ℹ️ ICE candidate received but connection already established for", fromSocketId);
        } else if (err.name === "OperationError" && err.message?.includes("already exists")) {
          console.log("ℹ️ Duplicate ICE candidate ignored for", fromSocketId);
        } else {
          console.error("❌ Error adding ICE candidate:", err, "for", fromSocketId);
        }
      }
    };

    console.log("👂 Setting up socket listeners for meeting room");

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
            console.warn("Failed to save handRaisedMap to localStorage:", error);
          }
        }
        return next;
      });
    };
    const onMediaStateUpdated = (data) => {
      const sid = data?.socketId || data?.id;
      const mid = data?.meetingId;
      if (!sid || !mid || mid !== meetingIdRef.current) return;
      console.log("📹 Received mediaStateUpdated for", sid, { audioMuted: !!data.audioMuted, videoMuted: !!data.videoMuted });
      setMediaStateMap((m) => ({
        ...m,
        [sid]: { audioMuted: !!data.audioMuted, videoMuted: !!data.videoMuted },
      }));
    };

    socket.on("webrtcOffer", onWebrtcOffer);
    socket.on("webrtcAnswer", onWebrtcAnswer);
    socket.on("webrtcIceCandidate", onIceCandidate);
    socket.on("handRaised", onHandRaised);
    socket.on("mediaStateUpdated", onMediaStateUpdated);

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

    return () => {
      socket.off("participantJoined", onParticipantJoined);
      socket.off("participantLeft", onParticipantLeft);
      socket.off("webrtcOffer", onWebrtcOffer);
      socket.off("webrtcAnswer", onWebrtcAnswer);
      socket.off("webrtcIceCandidate", onIceCandidate);
      socket.off("handRaised", onHandRaised);
      socket.off("mediaStateUpdated", onMediaStateUpdated);
      socket.off("reaction", onReaction);
      socket.off("meetingReaction", onReaction);
      socket.off("reactionReceived", onReaction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePeer, createPeerConnection, socket, createAndSendOffer, ensureLocalMedia]);
}