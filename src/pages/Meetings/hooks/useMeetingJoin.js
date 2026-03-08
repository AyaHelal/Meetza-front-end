import { useCallback, useEffect, useRef } from "react";
import * as meetingSocketService from "../services/meetingSocketService";
import { toParticipant, isScreenShareVideoTrack } from "../components/meetingRoomUtils";

/**
 * Returns startAndJoinMeetingRtc, stopMeetingRtc, and startJoinRef (for pre-join to call with options).
 * All refs and setters come from opts.
 */
export function useMeetingJoin(opts) {
  const {
    socket,
    isConnected,
    meetingIdRef,
    startedRef,
    hasJoined,
    preJoin,
    localStreamRef,
    setLocalStream,
    cameraVideoTrackRef,
    setVideoMuted,
    setContextVideoMuted,
    setAudioMuted,
    setContextAudioMuted,
    contextVideoMuted,
    contextAudioMuted,
    videoMuted,
    setParticipants,
    setHasJoined,
    setMediaContextHasJoined,
    setRemoteStreams,
    setMediaStateMap,
    setScreenSharing,
    audioMuted,
    user,
    location,
    peersRef,
    politeRef,
    makingOfferRef,
    peerMetaRef,
    getPeerConnections,
    registerPeerConnection,
    unregisterPeerConnection,
    createPeerConnection,
    closePeer,
    createAndSendOffer,
    addTracksToAllPeers,
    ensureLocalMedia,
    localVideoRef,
    localVideoRef2,
  } = opts;

  const startJoinRef = useRef(null);

  const startAndJoinMeetingRtc = useCallback(
    async (options = {}) => {
      if (!socket || !isConnected) return;
      const mid = meetingIdRef.current;
      if (!mid) return;
      if (startedRef.current) return;

      const { preObtainedStream, initialVideoMuted, initialAudioMuted } = options;
      const isReturning = (() => {
        try {
          return sessionStorage.getItem("activeMeetingId") === String(mid);
        } catch {
          return false;
        }
      })();
      const storedHasJoined = (() => {
        try {
          return sessionStorage.getItem(`meeting_hasJoined_${mid}`) === "true";
        } catch {
          return false;
        }
      })();
      const isFirstJoin = !isReturning && !hasJoined && !storedHasJoined;

      startedRef.current = true;

      if (preObtainedStream) {
        localStreamRef.current = preObtainedStream;
        setLocalStream(preObtainedStream);
        const videoTrack = preObtainedStream.getVideoTracks()[0] || null;
        cameraVideoTrackRef.current = videoTrack;
        const wantVideo = !(initialVideoMuted ?? true);
        const wantAudio = !(initialAudioMuted ?? true);
        if (videoTrack) videoTrack.enabled = wantVideo;
        preObtainedStream.getAudioTracks().forEach((t) => (t.enabled = wantAudio));
        setVideoMuted(initialVideoMuted ?? true);
        setContextVideoMuted(initialVideoMuted ?? true);
        setAudioMuted(initialAudioMuted ?? true);
        setContextAudioMuted(initialAudioMuted ?? true);
      } else {
        try {
          await ensureLocalMedia();
        } catch (e) {
          console.error("getUserMedia failed:", e);
          startedRef.current = false;
          return { error: "Could not access camera/microphone." };
        }
        const wantVideo = !contextVideoMuted;
        const wantAudio = !contextAudioMuted;
        setVideoMuted(contextVideoMuted);
        setContextVideoMuted(contextVideoMuted);
        setAudioMuted(contextAudioMuted);
        setContextAudioMuted(contextAudioMuted);
        const cameraTrack = cameraVideoTrackRef.current;
        if (cameraTrack) cameraTrack.enabled = wantVideo;
        const stream = localStreamRef.current;
        if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = wantAudio));
      }

      meetingSocketService.joinMeeting(socket, mid, async (ack) => {
        if (!ack?.ok) {
          startedRef.current = false;
          return { error: ack?.message || "Failed to join meeting room." };
        }

        try {
          sessionStorage.setItem("activeMeetingId", String(mid));
          const groupId = location?.state?.groupId;
          if (groupId) sessionStorage.setItem("activeMeetingGroupId", String(groupId));
        } catch (e) {
        }

        const others = Array.isArray(ack?.participants) ? ack.participants : [];
        const othersNorm = others.map((p) =>
          toParticipant({
            ...p,
            member_id: p?.user_id ?? p?.member_id,
            member_name: p?.member_name ?? p?.name,
            member_photo: p?.user_photo ?? p?.member_photo,
          })
        );
        const selfEntry = {
          socketId: socket.id,
          member_id: user?.id,
          member_name: user?.name || user?.email || "You",
          member_photo: user?.user_photo,
          member_email: user?.email,
        };
        setParticipants([selfEntry, ...othersNorm]);
        setHasJoined(true);
        setMediaContextHasJoined(true);
        try {
          sessionStorage.setItem(`meeting_hasJoined_${mid}`, "true");
        } catch (e) {
        }

        if (isReturning && getPeerConnections) {
          const existingPeers = getPeerConnections();
          if (existingPeers.size > 0) {
            const restoredStreams = [];
            for (const [peerSocketId, pc] of existingPeers.entries()) {
              const isCurrentParticipant = othersNorm.some((p) => (p?.socketId || p?.id) === peerSocketId);
              if (!isCurrentParticipant) continue;
              if (pc.connectionState === "closed" || pc.signalingState === "closed") continue;
              const receivers = pc.getReceivers();
              if (receivers.length === 0) continue;
              const restoredStream = new MediaStream();
              receivers.forEach((receiver) => {
                if (receiver.track && receiver.track.readyState !== "ended") restoredStream.addTrack(receiver.track);
              });
              if (restoredStream.getTracks().length > 0) {
                const videoTrack = restoredStream.getVideoTracks()[0];
                const isScreenShare = videoTrack && isScreenShareVideoTrack(videoTrack);
                restoredStreams.push({ socketId: peerSocketId, stream: restoredStream, isScreenShare });
                if (videoTrack && !isScreenShare && videoTrack.enabled && videoTrack.readyState === "live") {
                  setMediaStateMap((prev) => ({
                    ...prev,
                    [peerSocketId]: { ...prev[peerSocketId], videoMuted: false },
                  }));
                }
              }
              peersRef.current.set(peerSocketId, pc);
            }
            if (restoredStreams.length > 0) setRemoteStreams(restoredStreams);
          }
        }

        const currentVideoMuted = preObtainedStream ? (initialVideoMuted ?? true) : videoMuted;
        const currentAudioMuted = preObtainedStream ? (initialAudioMuted ?? true) : audioMuted;
        meetingSocketService.updateMediaState(socket, mid, currentAudioMuted, currentVideoMuted);

        let stream = localStreamRef.current;
        if (!stream) {
          await new Promise((r) => setTimeout(r, 500));
          stream = localStreamRef.current;
        }

        for (const p of othersNorm) {
          const peerSocketId = p?.socketId || p?.id || p;
          if (!peerSocketId || peerSocketId === socket.id) continue;
          if (peersRef.current.has(peerSocketId)) {
            const existingPc = peersRef.current.get(peerSocketId);
            if (existingPc) registerPeerConnection(peerSocketId, existingPc);
            continue;
          }
          if (isReturning && getPeerConnections) {
            const existingPeers = getPeerConnections();
            if (existingPeers.has(peerSocketId)) {
              const existingPc = existingPeers.get(peerSocketId);
              if (existingPc.connectionState !== "closed" && existingPc.signalingState !== "closed") {
                peersRef.current.set(peerSocketId, existingPc);
                continue;
              }
              unregisterPeerConnection(peerSocketId);
            }
          }
          const meta = {
            member_id: p?.member_id ?? p?.memberId ?? p?.userId ?? p?.user_id,
            member_name: p?.member_name ?? p?.memberName ?? p?.name,
            member_photo: p?.member_photo ?? p?.memberPhoto ?? p?.photo,
          };
          if (meta.member_id || meta.member_name || meta.member_photo) peerMetaRef.current.set(peerSocketId, meta);

          const pc = createPeerConnection(peerSocketId);
          peersRef.current.set(peerSocketId, pc);
          if (socket.id < peerSocketId) {
            politeRef.current.set(peerSocketId, false);
            await createAndSendOffer(peerSocketId);
          } else {
            politeRef.current.set(peerSocketId, true);
          }
        }

        setTimeout(() => addTracksToAllPeers(), 200);
        setTimeout(() => {
          for (const [peerSocketId, pc] of peersRef.current.entries()) {
            if (pc.connectionState === "connected" || pc.connectionState === "connecting") {
              const receivers = pc.getReceivers();
              const hasTracks = receivers.some((r) => r.track);
              if (!hasTracks && pc.signalingState === "stable" && !makingOfferRef.current) {
                createAndSendOffer(peerSocketId).catch((err) => console.warn("Renegotiate failed", peerSocketId, err));
              }
            } else if (pc.connectionState === "new" || pc.connectionState === "closed") {
              if (!politeRef.current.get(peerSocketId)) {
                createAndSendOffer(peerSocketId).catch((err) => console.warn("Retry failed", peerSocketId, err));
              }
            }
          }
        }, 1000);
      });
    },
    [
      socket,
      isConnected,
      hasJoined,
      ensureLocalMedia,
      createPeerConnection,
      createAndSendOffer,
      addTracksToAllPeers,
      contextVideoMuted,
      contextAudioMuted,
      videoMuted,
      audioMuted,
      location,
      user,
    ]
  );

  const stopMeetingRtc = useCallback(() => {
    const mid = meetingIdRef.current;
    if (socket && mid) meetingSocketService.leaveMeeting(socket, mid);
    for (const [peerSocketId] of peersRef.current.entries()) closePeer(peerSocketId);
    peersRef.current = new Map();
    setRemoteStreams([]);
    setParticipants([]);
    setHasJoined(false);
    setMediaContextHasJoined(false);
    try {
      if (mid) sessionStorage.removeItem(`meeting_hasJoined_${mid}`);
      sessionStorage.removeItem("activeMeetingId");
      sessionStorage.removeItem("activeMeetingGroupId");
    } catch (e) {
    }
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    cameraVideoTrackRef.current = null;
    setLocalStream(null);
    if (localVideoRef?.current) localVideoRef.current.srcObject = null;
    if (localVideoRef2?.current) localVideoRef2.current.srcObject = null;
    setScreenSharing(false);
    startedRef.current = false;
  }, [socket, closePeer, setParticipants, setHasJoined, setRemoteStreams, setLocalStream, setScreenSharing]);

  useEffect(() => {
    startJoinRef.current = startAndJoinMeetingRtc;
  }, [startAndJoinMeetingRtc]);

  return { startAndJoinMeetingRtc, stopMeetingRtc, startJoinRef };
}
