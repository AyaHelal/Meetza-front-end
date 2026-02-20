import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./MeetingRoom.css";
import {
  MeetingRoomHeader,
  MeetingRoomFullscreenVideos,
  MeetingRoomSliderViewport,
  MeetingRoomGrid,
  MeetingRoomSingleView,
  MeetingRoomScreenPlaceholder,
  MeetingRoomFloatingEmojis,
  MeetingRoomSliderDots,
  MeetingRoomControlBar,
  MeetingRoomReactionsContainer,
} from "./MeetingRoom/index";
import { toParticipant, getReactionIcon, isScreenShareVideoTrack, isScreenShareStream, toggleFullscreenForElement } from "./MeetingRoom/meetingRoomUtils";
import { useMeetingRoomSocketListeners } from "./MeetingRoom/useMeetingRoomSocketListeners";
import { useMeetingRoomFullscreen } from "./MeetingRoom/useMeetingRoomFullscreen";
import { useMeetingRoomMediaEffects } from "./MeetingRoom/useMeetingRoomMediaEffects";
import { useMeetingRoomMeetingId } from "./MeetingRoom/useMeetingRoomMeetingId";
import { useMeetingRoomMeetingLifecycle } from "./MeetingRoom/useMeetingRoomMeetingLifecycle";
import {
  createPeerConnectionImpl,
  addTracksToAllPeersImpl,
  ensureLocalMediaImpl,
  createAndSendOfferImpl,
  ensureMediaTracksImpl,
} from "./MeetingRoom/meetingRoomRtc";
import { useMeetingRoomReactions } from "./MeetingRoom/useMeetingRoomReactions";
import { useMeetingRoomUnifiedTiles } from "./MeetingRoom/useMeetingRoomUnifiedTiles";
import { useMeetingRoomParticipantHelpers } from "./MeetingRoom/useMeetingRoomParticipantHelpers";
import api from "../../../API/axiosInstance";
import { smartToast } from "../../../API/toastManager";
import { useSocket } from "../../../context/SocketContext";
import { AuthContext } from "../../../context/AuthContext";
import { useMeetingContext } from "../../../context/MeetingContext";
import { useMediaContext } from "../../../context/MediaContext";

const MeetingRoom = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream, isScreenShare? }]

  const [handRaisedMap, setHandRaisedMap] = useState(() => {
    // Initialize with empty object, will load when meetingId is set
    return {};
  });
  const [mediaStateMap, setMediaStateMap] = useState({}); // { [socketId]: { audioMuted, videoMuted } }
  const [localParticipantVolume, setLocalParticipantVolume] = useState({}); // { [socketId]: number } - 0-1, default 1
  const [meetingTitle, setMeetingTitle] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { socket, isConnected } = useSocket();
  const { user } = useContext(AuthContext);
  const { participants, setParticipants, setMeetingId, setHasJoined, hasJoined, addChatMessage, localParticipantAudioMuted, setLocalParticipantAudioMuted } = useMeetingContext();

  // Get persistent media streams and state from MediaContext
  const {
    localStreamRef,
    cameraVideoTrackRef,
    screenTrackRef,
    audioMuted: contextAudioMuted,
    videoMuted: contextVideoMuted,
    setAudioMuted: setContextAudioMuted,
    setVideoMuted: setContextVideoMuted,
    registerPeerConnection,
    unregisterPeerConnection,
    getPeerConnections,
    setMeetingId: setMediaContextMeetingId,
    setHasJoined: setMediaContextHasJoined,
  } = useMediaContext();

  // Use MediaContext state, but keep local state for UI updates
  const [audioMuted, setAudioMuted] = useState(contextAudioMuted);
  const [videoMuted, setVideoMuted] = useState(contextVideoMuted);

  // Sync with MediaContext state changes
  useEffect(() => {
    setAudioMuted(contextAudioMuted);
  }, [contextAudioMuted]);

  useEffect(() => {
    setVideoMuted(contextVideoMuted);
  }, [contextVideoMuted]);
  const [handRaised, setHandRaised] = useState(() => {
    try {
      const v = sessionStorage.getItem("meetza_handRaised");
      return v !== null ? v === "true" : false;
    } catch { return false; }
  });
  const [screenSharing, setScreenSharing] = useState(false);

  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const peerMetaRef = useRef(new Map()); // socketId -> { member_id, member_name, member_photo }
  const meetingIdRef = useRef(null);
  const startedRef = useRef(false);
  const localVideoRef = useRef(null);
  const localVideoRef2 = useRef(null); // separate ref for single view (slide 2)
  const sliderViewportRef = useRef(null);
  const remoteVideoRefsMap = useRef(new Map()); // socketId -> video element (for local audio control sync)
  // Note: localStreamRef, cameraVideoTrackRef, and screenTrackRef come from MediaContext
  const makingOffer = useRef(false); // Track if we're currently making an offer
  const polite = useRef(new Map()); // socketId -> boolean (true = polite, false = impolite)
  const iceQueueRef = useRef(new Map()); // socketId -> [candidates]
  const createAndSendOfferRef = useRef(null); // Ref to store createAndSendOffer function

  const meetingId = useMeetingRoomMeetingId({
    location,
    searchParams,
    meetingIdRef,
    setMeetingId,
    setMediaContextMeetingId,
  });

  // Persist media state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("meetza_audioMuted", String(audioMuted));
      sessionStorage.setItem("meetza_videoMuted", String(videoMuted));
    } catch { /* ignore */ }
  }, [audioMuted, videoMuted]);

  const upsertRemoteStream = useCallback((socketId, stream, isScreenShare = false) => {
    if (!socketId || !stream) return;
    console.log("🔄 Upserting remote stream:", socketId, {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
      audioTrackEnabled: stream.getAudioTracks()[0]?.enabled,
      videoTrackReadyState: stream.getVideoTracks()[0]?.readyState,
      audioTrackReadyState: stream.getAudioTracks()[0]?.readyState,
    });
    setRemoteStreams((prev) => {
      const idx = prev.findIndex((x) => x.socketId === socketId);
      const entry = { socketId, stream, isScreenShare };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });

    // Ensure video element plays when stream is updated
    setTimeout(() => {
      const videoEl = remoteVideoRefsMap.current.get(socketId);
      if (videoEl && stream) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          console.log("🔄 Updated video srcObject for", socketId);
        }
        videoEl.muted = !!localParticipantAudioMuted[socketId];
        videoEl.volume = localParticipantVolume[socketId] ?? 1;
        if (videoEl.paused) {
          videoEl.play().catch(err => {
            console.warn("⚠️ Failed to play video after stream update:", err);
          });
        }
      }
    }, 100);
  }, [localParticipantAudioMuted, localParticipantVolume]);

  const removeRemoteStream = useCallback((socketId) => {
    setRemoteStreams((prev) => prev.filter((x) => x.socketId !== socketId));
  }, []);

  const closePeer = useCallback((peerSocketId) => {
    const pc = peersRef.current.get(peerSocketId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {
        // ignore
      }
      peersRef.current.delete(peerSocketId);
      // Unregister from MediaContext
      unregisterPeerConnection(peerSocketId);
    }
    removeRemoteStream(peerSocketId);
  }, [removeRemoteStream, unregisterPeerConnection]);

  const createPeerConnection = useCallback(
    (peerSocketId) =>
      createPeerConnectionImpl(peerSocketId, {
        socket,
        meetingIdRef,
        localStreamRef,
        politeRef: polite,
        createAndSendOfferRef,
        upsertRemoteStream,
        registerPeerConnection,
        setMediaStateMap,
        setRemoteStreams,
      }),
    [socket, upsertRemoteStream, registerPeerConnection]
  );

  const addTracksToAllPeers = useCallback(() => {
    addTracksToAllPeersImpl({
      localStreamRef,
      peersRef,
      makingOfferRef: makingOffer,
      meetingIdRef,
      socket,
    });
  }, [socket]);

  const ensureLocalMedia = useCallback(
    () =>
      ensureLocalMediaImpl({
        localStreamRef,
        setLocalStream,
      }),
    []
  );

  const createAndSendOffer = useCallback(
    (targetSocketId) =>
      createAndSendOfferImpl(
        {
          peersRef,
          localStreamRef,
          makingOfferRef: makingOffer,
          meetingIdRef,
          socket,
          ensureLocalMedia,
        },
        targetSocketId
      ),
    [socket, ensureLocalMedia]
  );

  useEffect(() => {
    createAndSendOfferRef.current = createAndSendOffer;
  }, [createAndSendOffer]);

  const ensureMediaTracks = useCallback(
    (options = {}) =>
      ensureMediaTracksImpl(
        {
          localStreamRef,
          peersRef,
          cameraVideoTrackRef,
          setLocalStream,
          addTracksToAllPeers,
          ensureLocalMedia,
          audioMuted,
          videoMuted,
        },
        options
      ),
    [audioMuted, videoMuted, ensureLocalMedia, addTracksToAllPeers]
  );

  const startAndJoinMeetingRtc = useCallback(async () => {
    if (!socket || !isConnected) return;
    const mid = meetingIdRef.current;
    if (!mid) return;
    if (startedRef.current) return;

    // Check if this is the first time joining (not returning to an existing meeting)
    // If activeMeetingId exists in sessionStorage and matches current meeting, we're returning
    const isReturning = (() => {
      try {
        const stored = sessionStorage.getItem("activeMeetingId");
        return stored === String(mid);
      } catch {
        return false;
      }
    })();

    // Also check if we have hasJoined in sessionStorage for this meeting
    const storedHasJoined = (() => {
      try {
        const stored = sessionStorage.getItem(`meeting_hasJoined_${mid}`);
        return stored === "true";
      } catch {
        return false;
      }
    })();

    const isFirstJoin = !isReturning && !hasJoined && !storedHasJoined;

    if (isReturning) {
      console.log("🔄 Returning to existing meeting - preserving all state");
    } else if (isFirstJoin) {
      console.log("🆕 First time joining meeting");
    }

    startedRef.current = true;

    try {
      await ensureLocalMedia();
    } catch (e) {
      console.error("❌ getUserMedia failed:", e);
      smartToast.error("Could not access camera/microphone.");
      startedRef.current = false;
      return;
    }

    // Ensure camera is off by default when first entering a meeting
    // But preserve state when returning (don't force it off)
    if (isFirstJoin) {
      console.log("📹 Ensuring camera is off by default when first entering meeting");
      setVideoMuted(true);
      setContextVideoMuted(true);
      // Disable any existing camera track
      const cameraTrack = cameraVideoTrackRef.current;
      if (cameraTrack) {
        cameraTrack.enabled = false;
      }
    } else if (isReturning) {
      // When returning, restore camera state from sessionStorage/context
      // The state should already be loaded, but ensure the track matches
      console.log("🔄 Returning to meeting - preserving camera state:", { videoMuted, contextVideoMuted });
      const cameraTrack = cameraVideoTrackRef.current;
      if (cameraTrack) {
        cameraTrack.enabled = !videoMuted;
        console.log("📹 Restored camera track state on return:", { videoMuted, trackEnabled: cameraTrack.enabled });
      }
    }

    console.log("📤 Emitting joinMeetingRoom for meeting:", mid);
    socket.emit("joinMeetingRoom", { meetingId: mid }, async (ack) => {
      console.log("📥 joinMeetingRoom ack received:", ack);
      if (!ack?.ok) {
        console.error("❌ joinMeetingRoom failed:", ack);
        smartToast.error(ack?.message || "Failed to join meeting room.");
        startedRef.current = false;
        return;
      }
      console.log("✅ Successfully joined meeting room");

      // Persist active meeting so that other parts of the app (e.g. logout handler, floating tile)
      // can perform a proper leave if the user logs out while in a meeting.
      try {
        sessionStorage.setItem("activeMeetingId", String(mid));
        const groupId = location?.state?.groupId;
        if (groupId) sessionStorage.setItem("activeMeetingGroupId", String(groupId));
      } catch (e) {
        console.warn("Could not persist activeMeetingId to sessionStorage:", e);
      }

      const others = Array.isArray(ack?.participants) ? ack.participants : [];
      const othersNorm = others.map((p) => toParticipant({ ...p, member_id: p?.user_id ?? p?.member_id, member_name: p?.member_name ?? p?.name, member_photo: p?.user_photo ?? p?.member_photo }));
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

      // Persist hasJoined state so we know we're returning next time
      try {
        sessionStorage.setItem(`meeting_hasJoined_${mid}`, "true");
      } catch (e) {
        console.warn("Could not persist hasJoined to sessionStorage:", e);
      }

      // When returning, try to restore remote streams from existing peer connections in MediaContext
      // Note: After page refresh, peer connections are lost (they're in memory), so this will only work
      // if we navigated away without refreshing (e.g., using React Router navigation)
      if (isReturning && getPeerConnections) {
        console.log("🔄 Attempting to restore remote streams from existing peer connections...");
        const existingPeers = getPeerConnections();

        // Only try to restore if we actually have peer connections (not after refresh)
        if (existingPeers.size > 0) {
          const restoredStreams = [];

          for (const [peerSocketId, pc] of existingPeers.entries()) {
            // Check if this peer is in the current participants list
            const isCurrentParticipant = othersNorm.some(p => (p?.socketId || p?.id) === peerSocketId);
            if (!isCurrentParticipant) continue;

            // Check if peer connection is still valid (not closed)
            if (pc.connectionState === 'closed' || pc.signalingState === 'closed') {
              console.log("⚠️ Skipping closed peer connection for", peerSocketId);
              continue;
            }

            // Get receivers from peer connection
            const receivers = pc.getReceivers();
            if (receivers.length === 0) {
              console.log("⚠️ No receivers found for", peerSocketId, "- will wait for ontrack events");
              continue;
            }

            // Create stream from receivers
            const restoredStream = new MediaStream();
            receivers.forEach(receiver => {
              if (receiver.track && receiver.track.readyState !== 'ended') {
                restoredStream.addTrack(receiver.track);
              }
            });

            if (restoredStream.getTracks().length > 0) {
              const videoTrack = restoredStream.getVideoTracks()[0];
              const isScreenShare = videoTrack && isScreenShareVideoTrack(videoTrack);

              restoredStreams.push({ socketId: peerSocketId, stream: restoredStream, isScreenShare });
              console.log("✅ Restored stream for", peerSocketId, {
                videoTracks: restoredStream.getVideoTracks().length,
                audioTracks: restoredStream.getAudioTracks().length,
                isScreenShare,
                videoTrackReadyState: videoTrack?.readyState,
                videoTrackEnabled: videoTrack?.enabled,
              });

              // If we have video tracks, optimistically set media state
              if (videoTrack && !isScreenShare && videoTrack.enabled && videoTrack.readyState === 'live') {
                setMediaStateMap((prev) => ({
                  ...prev,
                  [peerSocketId]: {
                    ...prev[peerSocketId],
                    videoMuted: false, // Camera appears to be on
                  },
                }));
              }
            }

            // Sync peer connection to MeetingRoom's peersRef
            peersRef.current.set(peerSocketId, pc);
          }

          if (restoredStreams.length > 0) {
            setRemoteStreams(restoredStreams);
            console.log(`✅ Restored ${restoredStreams.length} remote streams from existing connections`);
          } else {
            console.log("ℹ️ No streams to restore - will wait for ontrack events from new connections");
          }
        } else {
          console.log("ℹ️ No existing peer connections found (likely after page refresh) - will create new connections");
        }
      }

      // Use current state (camera should be off if first join, or preserved if returning)
      const currentVideoMuted = isFirstJoin ? true : videoMuted;
      socket.emit("updateMediaState", { meetingId: mid, audioMuted, videoMuted: currentVideoMuted });

      // Ensure local stream is ready before creating peer connections
      const stream = localStreamRef.current;
      if (!stream) {
        console.warn("⚠️ Local stream not ready, waiting...");
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      for (const p of othersNorm) {
        const peerSocketId = p?.socketId || p?.id || p;
        if (!peerSocketId) continue;
        if (peerSocketId === socket.id) continue;

        // Check if peer connection already exists (might persist from MediaContext or previous mount)
        // If returning, we might have existing connections in MediaContext that we've already synced
        if (peersRef.current.has(peerSocketId)) {
          console.log("✅ Peer connection already exists for", peerSocketId, "- reusing existing connection");
          // Ensure it's registered with MediaContext
          const existingPc = peersRef.current.get(peerSocketId);
          if (existingPc) {
            registerPeerConnection(peerSocketId, existingPc);
          }
          continue;
        }

        // Also check MediaContext's peer connections (they persist across navigation, but NOT across page refresh)
        // If we're returning and MediaContext has a valid connection, reuse it
        if (isReturning && getPeerConnections) {
          const existingPeers = getPeerConnections();
          if (existingPeers.has(peerSocketId)) {
            const existingPc = existingPeers.get(peerSocketId);
            // Only reuse if connection is still valid (not closed)
            if (existingPc.connectionState !== 'closed' && existingPc.signalingState !== 'closed') {
              console.log("✅ Reusing existing peer connection from MediaContext for", peerSocketId);
              peersRef.current.set(peerSocketId, existingPc);
              // Connection is already registered with MediaContext, just continue
              continue;
            } else {
              console.log("⚠️ Existing peer connection is closed for", peerSocketId, "- creating new one");
              // Remove the closed connection from MediaContext
              unregisterPeerConnection(peerSocketId);
            }
          }
        }

        // Store any metadata if backend provides it
        const meta = {
          member_id: p?.member_id || p?.memberId || p?.userId || p?.user_id,
          member_name: p?.member_name || p?.memberName || p?.name,
          member_photo: p?.member_photo || p?.memberPhoto || p?.photo,
        };
        if (meta.member_id || meta.member_name || meta.member_photo) {
          peerMetaRef.current.set(peerSocketId, meta);
        }

        console.log("🔗 Creating peer connection for", peerSocketId);
        const pc = createPeerConnection(peerSocketId);
        peersRef.current.set(peerSocketId, pc);

        // Determine polite/impolite based on socket.id comparison
        // The peer with smaller socket.id is impolite (initiates offer)
        if (socket.id < peerSocketId) {
          polite.current.set(peerSocketId, false); // We are impolite
          console.log("🔵 We are impolite for", peerSocketId, "(our id is smaller)");
          // We initiate the offer
          await createAndSendOffer(peerSocketId);
        } else {
          polite.current.set(peerSocketId, true); // We are polite
          console.log("🟢 We are polite for", peerSocketId, "(their id is smaller)");
          // We wait for their offer
        }
      }

      // Final check: add tracks to all peers after a short delay
      setTimeout(() => addTracksToAllPeers(), 200);

      // After rejoining, give other participants time to create peer connections to us
      // and ensure we re-negotiate properly. Also trigger a renegotiation for existing peers
      // to ensure streams are re-established after refresh.
      setTimeout(() => {
        console.log("🔄 Ensuring all peer connections are properly established after rejoin...");
        for (const [peerSocketId, pc] of peersRef.current.entries()) {
          if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
            // Connection is good, but ensure tracks are being received
            const receivers = pc.getReceivers();
            const hasVideo = receivers.some(r => r.track && r.track.kind === 'video');
            const hasAudio = receivers.some(r => r.track && r.track.kind === 'audio');

            // Only trigger renegotiation if we truly have no tracks and connection is stable
            // Don't renegotiate if we're already negotiating
            if (!hasVideo && !hasAudio && pc.signalingState === 'stable' && !makingOffer.current) {
              console.log("⚠️ No tracks received from", peerSocketId, "- triggering renegotiation");
              // Trigger renegotiation by creating a new offer
              createAndSendOffer(peerSocketId).catch(err => {
                console.warn("Failed to renegotiate with", peerSocketId, err);
              });
            }
          } else if (pc.connectionState === 'new' || pc.connectionState === 'closed') {
            // Connection not established, try to create offer if we're impolite
            const isPolite = polite.current.get(peerSocketId);
            if (!isPolite) {
              console.log("🔄 Retrying connection to", peerSocketId);
              createAndSendOffer(peerSocketId).catch(err => {
                console.warn("Failed to retry connection to", peerSocketId, err);
              });
            }
          }
        }
      }, 1000); // Wait 1 second for initial negotiation to complete
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPeerConnection, ensureLocalMedia, isConnected, socket, createAndSendOffer]);

  const stopMeetingRtc = useCallback(() => {
    const mid = meetingIdRef.current;
    if (socket && mid) {
      socket.emit("leaveMeetingRoom", { meetingId: mid });
    }

    // close peer connections
    for (const [peerSocketId] of peersRef.current.entries()) {
      closePeer(peerSocketId);
    }
    peersRef.current = new Map();
    setRemoteStreams([]);
    setParticipants([]);
    setHasJoined(false);
    setMediaContextHasJoined(false);

    // Clear persisted hasJoined state when explicitly leaving
    try {
      if (mid) {
        sessionStorage.removeItem(`meeting_hasJoined_${mid}`);
      }
      sessionStorage.removeItem("activeMeetingId");
      sessionStorage.removeItem("activeMeetingGroupId");
    } catch (e) {
      console.warn("Could not clear hasJoined from sessionStorage:", e);
    }

    // stop local tracks
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    localStreamRef.current = null;
    cameraVideoTrackRef.current = null;
    setLocalStream(null);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (localVideoRef2.current) {
      localVideoRef2.current.srcObject = null;
    }

    setScreenSharing(false);
    startedRef.current = false;
  }, [closePeer, socket, setParticipants, setHasJoined]);

  // Auto-start RTC when entering meeting page with meetingId
  useEffect(() => {
    if (!meetingId || !socket || !isConnected) {
      console.log("⏸️ Not starting RTC - missing:", { meetingId: !!meetingId, socket: !!socket, isConnected });
      return;
    }
    if (startedRef.current) {
      console.log("⏸️ RTC already started, skipping");
      return;
    }
    console.log("🚀 Starting RTC meeting...");
    startAndJoinMeetingRtc();

    // Do NOT cleanup on unmount: meeting persists across navigation.
    // Only disconnect on explicit "Leave Meeting" (handleLeaveMeeting calls stopMeetingRtc).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, socket, isConnected]);

  useMeetingRoomMediaEffects({
    localStreamRef,
    cameraVideoTrackRef,
    localVideoRef,
    localVideoRef2,
    remoteVideoRefsMap,
    videoMuted,
    audioMuted,
    screenSharing,
    hasJoined,
    ensureMediaTracks,
    remoteStreams,
    localParticipantAudioMuted,
    localParticipantVolume,
  });

  const selfMemberId = useMemo(() => user?.id || user?.member_id || null, [user?.id, user?.member_id]);
  const selfEmail = useMemo(() => user?.email || null, [user?.email]);
  const selfPhoto = useMemo(
    () => user?.user_photo || user?.photo || user?.member_photo || null,
    [user?.user_photo, user?.photo, user?.member_photo]
  );

  const { getPeerLabel, getParticipantStream } = useMeetingRoomParticipantHelpers({
    peerMetaRef,
    remoteStreams,
  });

  const unifiedTiles = useMeetingRoomUnifiedTiles({
    participants,
    remoteStreams,
    socket,
    selfMemberId,
    videoMuted,
    screenSharing,
    mediaStateMap,
    localStreamRef,
  });

  const {
    reactionsMap,
    showEmojiPicker,
    setShowEmojiPicker,
    emojiPickerRef,
    emojiList,
    floatingEmojis,
    addReactionToMap,
    spawnFloatingEmojis,
    setReactionsMap,
  } = useMeetingRoomReactions({ meetingId, setHandRaisedMap, meetingIdRef });

  const {
    screenShareFullscreenRef,
    memberVideoFullscreenRef,
    screenShareVideoRef,
    memberVideoVideoRef,
    toggleFullscreenForScreenShare,
    toggleFullscreenForMember,
  } = useMeetingRoomFullscreen({
    localParticipantAudioMuted,
    localParticipantVolume,
    remoteStreams,
  });

  const handleLeaveMeeting = async () => {
    try {
      if (!meetingId) {
        smartToast.error("Missing meeting id. Can't leave meeting.");
        return;
      }

      // Stop WebRTC + leave socket room first (without disconnecting the app socket)
      stopMeetingRtc();

      await api.post(`/meeting/${meetingId}/leave`);
      try {
        sessionStorage.removeItem("activeMeetingId");
        sessionStorage.removeItem("activeMeetingGroupId");
      } catch (e) {
        // ignore storage errors
      }
      smartToast.success("Left the meeting.");
      // Return user to chats after leaving
      navigate("/home");
    } catch (error) {
      console.error("❌ Error leaving meeting:", error);
      smartToast.error(
        error.response?.data?.message || error.message || "Failed to leave meeting. Please try again."
      );
    }
  };

  const handleMeetingEnded = async () => {
    try {
      console.log("⏰ Meeting has ended, auto-exiting...");
      if (!meetingId) return;

      // Stop WebRTC first
      stopMeetingRtc();

      // Emit event so MainChat knows to hide Join button
      if (socket) {
        socket.emit("meetingEnded", { meetingId }, () => { });
      }

      // Try to call leave API (best effort)
      try {
        await api.post(`/meeting/${meetingId}/leave`);
        try {
          sessionStorage.removeItem("activeMeetingId");
          sessionStorage.removeItem("activeMeetingGroupId");
        } catch (e) {
          // ignore storage errors
        }
      } catch (e) {
        console.warn("⚠️ Could not call leave API:", e);
      }

      // Show notification and redirect
      smartToast.info("Meeting time has ended. Exiting...");
      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (error) {
      console.error("❌ Error in handleMeetingEnded:", error);
    }
  };

  useMeetingRoomMeetingLifecycle({
    meetingId,
    meetingIdRef,
    socket,
    onMeetingEnded: handleMeetingEnded,
    setMeetingTitle,
  });

  const handleToggleAudio = async () => {
    const nextMuted = !audioMuted;
    if (nextMuted) {
      setAudioMuted(true);
      const stream = localStreamRef.current;
      if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = false));
    } else {
      try {
        await ensureMediaTracks({ needAudio: true });
        const stream = localStreamRef.current;
        if (stream) {
          const audioTracks = stream.getAudioTracks();
          audioTracks.forEach((t) => {
            t.enabled = true;
          });

          // Ensure audio tracks are added to all peer connections and trigger renegotiation
          // Filter to only enabled, live audio tracks
          const enabledAudioTracks = audioTracks.filter(t => t.readyState === 'live');

          for (const [peerSocketId, pc] of peersRef.current.entries()) {
            const audioSenders = pc.getSenders().filter(s => s.track && s.track.kind === 'audio');

            // Remove any stopped/ended audio senders first
            audioSenders.forEach(sender => {
              if (sender.track && sender.track.readyState === 'ended') {
                try {
                  pc.removeTrack(sender);
                  console.log("🗑️ Removed ended audio track from peer", peerSocketId);
                } catch (err) {
                  console.error("❌ Error removing ended audio track:", err);
                }
              }
            });

            // Get updated senders after cleanup
            const updatedAudioSenders = pc.getSenders().filter(s => s.track && s.track.kind === 'audio');

            // If no audio senders, add all enabled audio tracks
            if (updatedAudioSenders.length === 0) {
              enabledAudioTracks.forEach(track => {
                try {
                  pc.addTrack(track, stream);
                  console.log("➕ Added enabled audio track to peer connection", peerSocketId, { trackId: track.id, enabled: track.enabled });
                } catch (err) {
                  console.error("❌ Error adding audio track to peer:", err);
                }
              });
            } else {
              // Replace existing audio tracks with new enabled ones
              const replacementPromises = [];
              enabledAudioTracks.forEach((track, index) => {
                const sender = updatedAudioSenders[index];
                if (sender) {
                  // Check if track is different or if current track is disabled/ended
                  if (sender.track !== track || sender.track.readyState === 'ended' || !sender.track.enabled) {
                    // Different track or track is bad, replace it
                    try {
                      const replacePromise = sender.replaceTrack(track).then(() => {
                        console.log("🔄 Replaced audio track in peer connection", peerSocketId, {
                          oldTrackId: sender.track?.id,
                          newTrackId: track.id,
                          enabled: track.enabled
                        });
                      }).catch(err => {
                        console.error("❌ Error replacing audio track:", err);
                        throw err;
                      });
                      replacementPromises.push(replacePromise);
                    } catch (err) {
                      console.error("❌ Error replacing audio track:", err);
                    }
                  } else {
                    // Same track, just ensure it's enabled
                    if (!sender.track.enabled) {
                      sender.track.enabled = true;
                      console.log("✅ Enabled existing audio track in peer connection", peerSocketId);
                    }
                  }
                } else {
                  // More tracks than senders, add the new one
                  try {
                    pc.addTrack(track, stream);
                    console.log("➕ Added additional audio track to peer connection", peerSocketId);
                  } catch (err) {
                    console.error("❌ Error adding additional audio track:", err);
                  }
                }
              });

              // Wait for all track replacements to complete, then trigger renegotiation
              Promise.all(replacementPromises).then(() => {
                // Small delay to ensure everything is settled
                setTimeout(() => {
                  try {
                    pc.createOffer().then(offer => {
                      pc.setLocalDescription(offer).then(() => {
                        const mid = meetingIdRef.current;
                        if (socket && mid) {
                          socket.emit("webrtcOffer", {
                            toSocketId: peerSocketId,
                            meetingId: mid,
                            sdp: offer
                          }, () => { });
                          console.log("📤 Sent renegotiation offer for audio to", peerSocketId);
                        }
                      }).catch(err => console.error("❌ Error renegotiating after audio toggle:", err));
                    }).catch(err => console.error("❌ Error creating offer after audio toggle:", err));
                  } catch (err) {
                    console.error("❌ Error in audio toggle renegotiation:", err);
                  }
                }, 100);
              }).catch(() => {
                // Even if some replacements failed, try renegotiation anyway
                setTimeout(() => {
                  try {
                    pc.createOffer().then(offer => {
                      pc.setLocalDescription(offer).then(() => {
                        const mid = meetingIdRef.current;
                        if (socket && mid) {
                          socket.emit("webrtcOffer", {
                            toSocketId: peerSocketId,
                            meetingId: mid,
                            sdp: offer
                          }, () => { });
                          console.log("📤 Sent renegotiation offer for audio to", peerSocketId, "(after some failures)");
                        }
                      }).catch(err => console.error("❌ Error renegotiating after audio toggle:", err));
                    }).catch(err => console.error("❌ Error creating offer after audio toggle:", err));
                  } catch (err) {
                    console.error("❌ Error in audio toggle renegotiation:", err);
                  }
                }, 100);
              });
            }

            // If no replacements were needed (tracks were just added), trigger renegotiation immediately
            if (updatedAudioSenders.length === 0) {
              setTimeout(() => {
                try {
                  pc.createOffer().then(offer => {
                    pc.setLocalDescription(offer).then(() => {
                      const mid = meetingIdRef.current;
                      if (socket && mid) {
                        socket.emit("webrtcOffer", {
                          toSocketId: peerSocketId,
                          meetingId: mid,
                          sdp: offer
                        }, () => { });
                        console.log("📤 Sent renegotiation offer for audio to", peerSocketId);
                      }
                    }).catch(err => console.error("❌ Error renegotiating after audio toggle:", err));
                  }).catch(err => console.error("❌ Error creating offer after audio toggle:", err));
                } catch (err) {
                  console.error("❌ Error in audio toggle renegotiation:", err);
                }
              }, 100);
            }
          }
        }
        setAudioMuted(false);
      } catch {
        setAudioMuted(true);
        return;
      }
    }
    const mid = meetingIdRef.current;
    if (socket && mid) socket.emit("updateMediaState", { meetingId: mid, audioMuted: nextMuted, videoMuted });
  };

  const handleToggleVideo = async () => {
    const nextMuted = !videoMuted;
    if (nextMuted) {
      setVideoMuted(true);
      const cameraTrack = cameraVideoTrackRef.current;
      if (cameraTrack) cameraTrack.enabled = false;
    } else {
      try {
        await ensureMediaTracks({ needVideo: true });
        const cameraTrack = cameraVideoTrackRef.current;
        if (cameraTrack) cameraTrack.enabled = true;
        setVideoMuted(false);
      } catch {
        setVideoMuted(true);
        return;
      }
    }
    const mid = meetingIdRef.current;
    if (socket && mid) socket.emit("updateMediaState", { meetingId: mid, audioMuted, videoMuted: nextMuted });
  };

  /** Mute/unmute all participants locally (affects only this user's listening) */
  const handleMuteUnmuteAllParticipants = useCallback(() => {
    const remoteIds = unifiedTiles
      .filter((t) => !t?.isSelf && t?.socketId)
      .map((t) => t.socketId);
    if (remoteIds.length === 0) return;
    const allMuted = remoteIds.every((sid) => !!localParticipantAudioMuted[sid]);
    const nextMuted = !allMuted;
    setLocalParticipantAudioMuted((prev) => {
      const next = { ...prev };
      remoteIds.forEach((sid) => {
        next[sid] = nextMuted;
      });
      return next;
    });
  }, [unifiedTiles, localParticipantAudioMuted]);

  const handleToggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    // Persist local hand raised state
    try {
      sessionStorage.setItem("meetza_handRaised", String(next));
    } catch (error) {
      console.warn("Failed to save handRaised to sessionStorage:", error);
    }
    const mid = meetingIdRef.current;
    if (socket && mid) {
      socket.emit("raiseHand", { meetingId: mid, raised: next });
    }
  };

  const handleSendComment = () => {
    const currentMeetingId = meetingIdRef.current || meetingId;

    if (!socket || !isConnected || !currentMeetingId) {
      console.warn("Cannot send comment - socket, connection, or meetingId missing", {
        socket: !!socket,
        isConnected,
        meetingId: currentMeetingId
      });
      return;
    }

    const trimmedText = commentText.trim();
    if (!trimmedText) {
      console.warn("Cannot send empty comment");
      return;
    }

    const senderName = user?.name || user?.member_name || user?.email || "You";
    const senderId = user?.id || user?.member_id || null;

    const payload = {
      meetingId: String(currentMeetingId),
      text: trimmedText,
      senderName: senderName,
      senderId: senderId,
    };

    console.log("Sending meetingChatMessage:", payload);
    console.log("Socket connected:", socket.connected);
    console.log("Socket id:", socket.id);

    // Add message optimistically (show immediately)
    const senderPhoto = user?.user_photo || user?.photo || null;
    const optimisticMessage = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: trimmedText,
      senderName: senderName,
      senderId: senderId,
      senderPhoto: senderPhoto,
      timestamp: Date.now(),
      isOwn: true,
    };
    addChatMessage(optimisticMessage);

    // Clear input immediately for better UX
    const messageText = trimmedText;
    setCommentText("");
    setShowCommentInput(false);

    socket.emit(
      "meetingChatMessage",
      payload,
      (ack) => {
        console.log("meetingChatMessage ack:", ack);
        if (ack && !ack.ok) {
          console.error("Failed to send comment:", ack);
          // Restore text if send failed
          setCommentText(messageText);
          // Optionally remove optimistic message on failure
        } else {
          console.log("Comment sent successfully");
        }
      }
    );
  };

  const handleSendLike = () => {
    const mid = meetingIdRef.current;
    if (!socket || !mid) {
      console.warn("⚠️ Cannot send reaction - socket or meetingId missing");
      return;
    }
    // include sender info so server can broadcast who reacted
    const payload = {
      meetingId: mid,
      type: "like",
      member_id: selfMemberId,
      member_name: user?.name || user?.member_name || user?.email || "You",
      fromSocketId: socket.id,
    };
    console.log("📤 Emitting reaction:", payload);
    socket.emit("reaction", payload, (ack) => {
      if (ack && !ack.ok) {
        console.error("❌ Reaction emit failed:", ack);
      } else {
        console.log("✅ Reaction emit acknowledged:", ack);
      }
    });

    // Optimistically show local reaction on your own tile
    try {
      const key = selfMemberId || selfEmail || socket.id || (user?.name || "You");
      const name = user?.name || user?.member_name || user?.email || "You";
      addReactionToMap(key, "like", name);
    } catch (e) {
      console.warn("Could not add local reaction:", e);
    }
  };

  const selectEmoji = (emoji) => {
    const mid = meetingIdRef.current;
    if (!mid || !socket) {
      console.warn("⚠️ Cannot send emoji - socket or meetingId missing");
      return;
    }
    const payload = {
      meetingId: mid,
      type: emoji, // use emoji char as type
      member_id: selfMemberId,
      member_name: user?.name || user?.member_name || user?.email || "You",
      fromSocketId: socket.id,
    };
    console.log("📤 Emitting emoji reaction:", payload);
    socket.emit("reaction", payload, (ack) => {
      if (ack && !ack.ok) {
        console.error("❌ Emoji reaction emit failed:", ack);
      } else {
        console.log("✅ Emoji reaction emit acknowledged:", ack);
      }
    });
    // update local map
    try {
      const key = selfMemberId || selfEmail || socket.id || (user?.name || "You");
      const name = user?.name || user?.member_name || user?.email || "You";
      addReactionToMap(key, emoji, name);
    } catch (e) {
      console.warn("Could not add emoji locally:", e);
    }
    // Spawn single floating emoji animation from bottom to top
    spawnFloatingEmojis(emoji, user?.name || user?.member_name || user?.email || "You", 1);
    setShowEmojiPicker(false);
  };

  useMeetingRoomSocketListeners({
    socket,
    meetingIdRef,
    peersRef,
    peerMetaRef,
    politeRef: polite,
    makingOfferRef: makingOffer,
    iceQueueRef,
    setParticipants,
    setHandRaisedMap,
    setReactionsMap,
    setMediaStateMap,
    toParticipantFn: toParticipant,
    localStreamRef,
    ensureLocalMedia,
    createPeerConnection,
    createAndSendOffer,
    closePeer,
    getReactionIcon,
    addReactionToMap,
    spawnFloatingEmojis,
    selfMemberId,
  });

  const handleToggleScreenShare = async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      try {
        stream = await ensureLocalMedia();
      } catch {
        smartToast.error("Could not start screen share. Please join the meeting first.");
        return;
      }
    }

    if (!screenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: true
        });
        const screenTrack = displayStream.getVideoTracks()?.[0];
        if (!screenTrack) return;

        screenTrackRef.current = screenTrack;
        setScreenSharing(true);

        const streamForScreen = new MediaStream([...stream.getAudioTracks(), screenTrack]);
        const mid = meetingIdRef.current;

        console.log("🖥️ Replacing video tracks with screen share for", peersRef.current.size, "peers");
        for (const [peerSocketId, pc] of peersRef.current.entries()) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) {
            console.log("🔄 Replacing track for peer", peerSocketId);
            try {
              await sender.replaceTrack(screenTrack);
              // Always trigger renegotiation after replacing track
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                console.log("📤 Sending renegotiation offer for screen share to", peerSocketId);
                socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, (ack) => {
                  if (ack && !ack.ok) {
                    console.error("❌ Screen share renegotiation failed:", ack);
                  } else {
                    console.log("✅ Screen share renegotiation sent to", peerSocketId);
                  }
                });
              } catch (renegErr) {
                console.error("❌ Renegotiation for screen share failed:", renegErr);
              }
              console.log("✅ Screen share track replaced for", peerSocketId);
            } catch (err) {
              console.error("❌ Failed to replace track for", peerSocketId, ":", err);
            }
          } else {
            console.log("➕ Adding screen share track to peer", peerSocketId);
            pc.addTrack(screenTrack, streamForScreen);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              console.log("📤 Sending renegotiation offer for screen share to", peerSocketId);
              socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, (ack) => {
                if (ack && !ack.ok) {
                  console.error("❌ Screen share renegotiation failed:", ack);
                } else {
                  console.log("✅ Screen share renegotiation sent to", peerSocketId);
                }
              });
            } catch (err) {
              console.error("❌ Renegotiation for screen share failed:", err);
            }
          }
        }

        const newStream = new MediaStream([...stream.getAudioTracks(), screenTrack]);
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        if (localVideoRef2.current) localVideoRef2.current.srcObject = newStream;

        screenTrack.onended = async () => {
          try {
            const cameraTrack = cameraVideoTrackRef.current;
            const mid = meetingIdRef.current;
            for (const [peerSocketId, pc] of peersRef.current.entries()) {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (sender) {
                await sender.replaceTrack(cameraTrack || null);
                // Trigger renegotiation after replacing back to camera
                try {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  if (socket && mid) {
                    socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, () => { });
                  }
                } catch (err) {
                  console.error("❌ Renegotiation after screen share ended failed:", err);
                }
              }
            }
            const restored = cameraTrack
              ? new MediaStream([...stream.getAudioTracks(), cameraTrack])
              : new MediaStream(stream.getAudioTracks());
            localStreamRef.current = restored;
            setLocalStream(restored);
            if (localVideoRef.current) localVideoRef.current.srcObject = restored;
            if (localVideoRef2.current) localVideoRef2.current.srcObject = restored;
          } finally {
            setScreenSharing(false);
            screenTrackRef.current = null;
          }
        };
      } catch (e) {
        console.error("❌ Screen share failed:", e);
        smartToast.error("Screen share failed.");
        setScreenSharing(false);
      }
    } else {
      const screenTrack = screenTrackRef.current;
      if (screenTrack) {
        screenTrack.stop();
        screenTrackRef.current = null;
      }
      const cameraTrack = cameraVideoTrackRef.current;
      const mid = meetingIdRef.current;
      for (const [peerSocketId, pc] of peersRef.current.entries()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(cameraTrack || null).then(async () => {
            // Trigger renegotiation after replacing back to camera
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (socket && mid) {
                socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, () => { });
              }
            } catch (err) {
              console.error("❌ Renegotiation after stopping screen share failed:", err);
            }
          }).catch(() => { });
        }
      }
      const restored = cameraTrack
        ? new MediaStream([...stream.getAudioTracks(), cameraTrack])
        : new MediaStream(stream.getAudioTracks());
      localStreamRef.current = restored;
      setLocalStream(restored);
      if (localVideoRef.current) localVideoRef.current.srcObject = restored;
      if (localVideoRef2.current) localVideoRef2.current.srcObject = restored;
      setScreenSharing(false);
      smartToast.success("Screen share stopped.");
    }
  };

  return (
    <div className="meeting-room">
      <MeetingRoomHeader
        meetingTitle={meetingTitle}
        onLeaveMeeting={handleLeaveMeeting}
        meetingId={meetingId}
      />

      <MeetingRoomFullscreenVideos
        screenShareFullscreenRef={screenShareFullscreenRef}
        screenShareVideoRef={screenShareVideoRef}
        memberVideoFullscreenRef={memberVideoFullscreenRef}
        memberVideoVideoRef={memberVideoVideoRef}
      />

      <MeetingRoomSliderViewport
        sliderViewportRef={sliderViewportRef}
        activeSlide={activeSlide}
        slide0={
          <MeetingRoomGrid
            unifiedTiles={unifiedTiles}
            handRaised={handRaised}
            handRaisedMap={handRaisedMap}
            localVideoRef={localVideoRef}
            remoteVideoRefsMap={remoteVideoRefsMap}
            localParticipantAudioMuted={localParticipantAudioMuted}
            localParticipantVolume={localParticipantVolume}
            toggleFullscreenForScreenShare={toggleFullscreenForScreenShare}
            toggleFullscreenForMember={toggleFullscreenForMember}
          />
        }
        slide1={
          <MeetingRoomSingleView
            localVideoRef2={localVideoRef2}
            videoMuted={videoMuted}
            screenSharing={screenSharing}
            selfPhoto={selfPhoto}
            user={user}
            handRaised={handRaised}
          />
        }
        slide2={<MeetingRoomScreenPlaceholder />}
        floatingEmojis={<MeetingRoomFloatingEmojis floatingEmojis={floatingEmojis} />}
      />

      <MeetingRoomSliderDots activeSlide={activeSlide} setActiveSlide={setActiveSlide} />

      <MeetingRoomControlBar
        showCommentInput={showCommentInput}
        setShowCommentInput={setShowCommentInput}
        commentText={commentText}
        setCommentText={setCommentText}
        audioMuted={audioMuted}
        videoMuted={videoMuted}
        handRaised={handRaised}
        screenSharing={screenSharing}
        meetingId={meetingId}
        unifiedTiles={unifiedTiles}
        localParticipantAudioMuted={localParticipantAudioMuted}
        handleToggleAudio={handleToggleAudio}
        handleToggleHand={handleToggleHand}
        handleToggleVideo={handleToggleVideo}
        handleToggleScreenShare={handleToggleScreenShare}
        setShowEmojiPicker={setShowEmojiPicker}
        handleSendComment={handleSendComment}
        handleMuteUnmuteAllParticipants={handleMuteUnmuteAllParticipants}
        socket={socket}
        isConnected={isConnected}
        showEmojiPicker={showEmojiPicker}
        emojiPickerRef={emojiPickerRef}
        emojiList={emojiList}
        selectEmoji={selectEmoji}
      />

      <MeetingRoomReactionsContainer reactionsMap={reactionsMap} getReactionIcon={getReactionIcon} />
    </div>
  );
};

export default MeetingRoom;