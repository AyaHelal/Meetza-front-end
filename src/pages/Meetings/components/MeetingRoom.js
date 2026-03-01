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
import { toParticipant, getReactionIcon, getCameraTrack, isScreenShareVideoTrack, toggleFullscreenForElement } from "./MeetingRoom/meetingRoomUtils";
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
import { useMeetingRecording } from "./MeetingRoom/useMeetingRecording";
import api from "../../../API/axiosInstance";
import { smartToast } from "../../../API/toastManager";
import { useSocket } from "../../../context/SocketContext";
import { AuthContext } from "../../../context/AuthContext";
import { useMeetingContext } from "../../../context/MeetingContext";
import { useMediaContext } from "../../../context/MediaContext";

const MeetingRoom = ({ recordRegionRef }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream, isScreenShare? }]
  const remoteStreamsRef = useRef([]);
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  const [handRaisedMap, setHandRaisedMap] = useState(() => {
    // Initialize with empty object, will load when meetingId is set
    return {};
  });
  const [localParticipantVolume, setLocalParticipantVolume] = useState({}); // { [socketId]: number } - 0-1, default 1
  const [meetingTitle, setMeetingTitle] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { socket, isConnected } = useSocket();
  const { user } = useContext(AuthContext);
  const { participants, setParticipants, setMeetingId, setHasJoined, hasJoined, addChatMessage, localParticipantAudioMuted, setLocalParticipantAudioMuted, mediaStateMap, setMediaStateMap } = useMeetingContext();

  // Get persistent media streams and state from MediaContext
  const {
    localStreamRef,
    cameraVideoTrackRef,
    screenTrackRef,
    audioMuted: contextAudioMuted,
    videoMuted: contextVideoMuted,
    setAudioMuted: setContextAudioMuted,
    setVideoMuted: setContextVideoMuted,
    meetingSpeakerMuted,
    setMeetingMediaRefs,
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

  // Pre-join modal: mandatory camera/mic before first join
  const [showPreJoinModal, setShowPreJoinModal] = useState(false);
  const [preJoinStream, setPreJoinStream] = useState(null);
  const [preJoinVideoMuted, setPreJoinVideoMuted] = useState(false);
  const [preJoinAudioMuted, setPreJoinAudioMuted] = useState(false);
  const [preJoinLoading, setPreJoinLoading] = useState(false);
  const [preJoinError, setPreJoinError] = useState(null);
  const preJoinVideoRef = useRef(null);

  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const peerMetaRef = useRef(new Map()); // socketId -> { member_id, member_name, member_photo }
  const meetingIdRef = useRef(null);
  const startedRef = useRef(false);
  const localVideoRef = useRef(null);
  const localVideoRef2 = useRef(null); // separate ref for single view (slide 2)
  const sliderViewportRef = useRef(null);
  const recordingStartedRef = useRef(false);
  const recordingPayloadRef = useRef(null);
  const remoteVideoRefsMap = useRef(new Map()); // socketId -> video element (for local audio control sync)
  const localParticipantAudioMutedRef = useRef({});
  const localParticipantVolumeRef = useRef({});
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

  // First-time join (not returning to same meeting)
  const isFirstJoin = useMemo(() => {
    const mid = meetingIdRef.current || meetingId;
    if (!mid) return true;
    try {
      const stored = sessionStorage.getItem("activeMeetingId");
      const isReturning = stored === String(mid);
      const storedHasJoined = sessionStorage.getItem(`meeting_hasJoined_${mid}`) === "true";
      return !isReturning && !hasJoined && !storedHasJoined;
    } catch {
      return true;
    }
  }, [meetingId, hasJoined]);

  // Persist media state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("meetza_audioMuted", String(audioMuted));
      sessionStorage.setItem("meetza_videoMuted", String(videoMuted));
    } catch { /* ignore */ }
  }, [audioMuted, videoMuted]);

  const upsertRemoteStream = useCallback((socketId, stream, isScreenShare = false) => {
    if (!socketId || !stream) return;
    const prev = remoteStreamsRef.current;
    const hasCamera = prev.some((x) => x.socketId === socketId && x.isScreenShare === false);
    const hasScreen = prev.some((x) => x.socketId === socketId && x.isScreenShare === true);
    const hasVideo = stream.getVideoTracks().length > 0;
    // If we already have a camera entry and this stream has video, it's the screen (second tile)
    const effectiveIsScreen = isScreenShare || (!isScreenShare && hasCamera && hasVideo && !hasScreen);

    setRemoteStreams((prevState) => {
      console.log("🔄 Upserting remote stream:", socketId, { isScreenShare: effectiveIsScreen, videoTracks: stream.getVideoTracks().length });
      const idx = prevState.findIndex((x) => x.socketId === socketId && x.isScreenShare === effectiveIsScreen);
      const entry = { socketId, stream, isScreenShare: effectiveIsScreen };
      if (idx >= 0) {
        const next = [...prevState];
        next[idx] = entry;
        return next;
      }
      return [...prevState, entry];
    });

    // Ensure video element plays when stream is updated (screen tile uses key `${socketId}-screen`)
    const videoKey = effectiveIsScreen ? `${socketId}-screen` : socketId;
    setTimeout(() => {
      const videoEl = remoteVideoRefsMap.current.get(videoKey);
      if (videoEl && stream) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          console.log("🔄 Updated video srcObject for", videoKey);
        }
        videoEl.muted = !!meetingSpeakerMuted || !!localParticipantAudioMuted[socketId];
        videoEl.volume = meetingSpeakerMuted ? 0 : (localParticipantVolume[socketId] ?? 1);
        if (videoEl.paused) {
          videoEl.play().catch((err) => {
            if (err?.name !== "AbortError") console.warn("⚠️ Failed to play video after stream update:", err);
          });
        }
      }
    }, 100);
  }, [localParticipantAudioMuted, localParticipantVolume, meetingSpeakerMuted]);

  // Keep refs in sync for apply-meeting-speaker callback (لما تدوس ميوت الساوند برة الميتينج يقفل الصوت من عندك)
  useEffect(() => {
    localParticipantAudioMutedRef.current = localParticipantAudioMuted;
    localParticipantVolumeRef.current = localParticipantVolume;
  }, [localParticipantAudioMuted, localParticipantVolume]);

  // تسجيل مراجع الفيديو في الـ context عشان لما تدوس ميوت الساوند برة الميتينج يقفل الصوت فعلياً
  useEffect(() => {
    if (!setMeetingMediaRefs) return;
    setMeetingMediaRefs({
      remoteVideoRefsMap,
      localParticipantAudioMutedRef,
      localParticipantVolumeRef,
    });
    return () => setMeetingMediaRefs(null);
  }, [setMeetingMediaRefs]);

  // تطبيق حالة الساوند على الفيديو عند التحميل وعند تغيير meetingSpeakerMuted
  useEffect(() => {
    const refs = { remoteVideoRefsMap, localParticipantAudioMutedRef, localParticipantVolumeRef };
    const map = refs.remoteVideoRefsMap.current;
    const lap = refs.localParticipantAudioMutedRef.current;
    const lpv = refs.localParticipantVolumeRef.current;
    map.forEach((el, socketId) => {
      if (el) {
        el.muted = !!meetingSpeakerMuted || !!lap[socketId];
        el.volume = meetingSpeakerMuted ? 0 : (lpv[socketId] ?? 1);
      }
    });
  }, [meetingSpeakerMuted, localParticipantAudioMuted, localParticipantVolume]);

  const removeRemoteStream = useCallback((socketId, isScreenShareOnly = false) => {
    setRemoteStreams((prev) =>
      isScreenShareOnly
        ? prev.filter((x) => !(x.socketId === socketId && x.isScreenShare))
        : prev.filter((x) => x.socketId !== socketId)
    );
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

  const startAndJoinMeetingRtc = useCallback(async (options = {}) => {
    if (!socket || !isConnected) return;
    const mid = meetingIdRef.current;
    if (!mid) return;
    if (startedRef.current) return;

    const { preObtainedStream, initialVideoMuted, initialAudioMuted } = options;

    // Check if this is the first time joining (not returning to an existing meeting)
    const isReturning = (() => {
      try {
        const stored = sessionStorage.getItem("activeMeetingId");
        return stored === String(mid);
      } catch {
        return false;
      }
    })();

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

    if (preObtainedStream) {
      // Use stream from pre-join modal; skip ensureLocalMedia
      localStreamRef.current = preObtainedStream;
      setLocalStream(preObtainedStream);
      const videoTrack = preObtainedStream.getVideoTracks()[0] || null;
      cameraVideoTrackRef.current = videoTrack;
      const wantVideo = !(initialVideoMuted ?? true);
      const wantAudio = !(initialAudioMuted ?? true);
      if (videoTrack) videoTrack.enabled = wantVideo;
      preObtainedStream.getAudioTracks().forEach((t) => { t.enabled = wantAudio; });
      setVideoMuted(initialVideoMuted ?? true);
      setContextVideoMuted(initialVideoMuted ?? true);
      setAudioMuted(initialAudioMuted ?? true);
      setContextAudioMuted(initialAudioMuted ?? true);
    } else {
      try {
        await ensureLocalMedia();
      } catch (e) {
        console.error("❌ getUserMedia failed:", e);
        smartToast.error("Could not access camera/microphone.");
        startedRef.current = false;
        return;
      }

      // Apply saved mic/camera state (context) so they stay as user left them; first unmute click then works
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

      // Use current state (pre-join modal or applied context state so others see correct mute)
      const currentVideoMuted = preObtainedStream ? (initialVideoMuted ?? true) : videoMuted;
      const currentAudioMuted = preObtainedStream ? (initialAudioMuted ?? true) : audioMuted;
      socket.emit("updateMediaState", { meetingId: mid, audioMuted: currentAudioMuted, videoMuted: currentVideoMuted });

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

  // Auto-start RTC when entering meeting page; first-time join → show pre-join modal
  useEffect(() => {
    if (!meetingId || !socket || !isConnected) {
      console.log("⏸️ Not starting RTC - missing:", { meetingId: !!meetingId, socket: !!socket, isConnected });
      return;
    }
    if (startedRef.current) {
      console.log("⏸️ RTC already started, skipping");
      return;
    }
    const mid = meetingIdRef.current || meetingId;
    const isReturning = (() => {
      try { return sessionStorage.getItem("activeMeetingId") === String(mid); } catch { return false; }
    })();
    const storedHasJoined = (() => {
      try { return sessionStorage.getItem(`meeting_hasJoined_${mid}`) === "true"; } catch { return false; }
    })();
    const firstJoin = !isReturning && !hasJoined && !storedHasJoined;
    if (firstJoin) {
      console.log("🆕 First join – showing pre-join modal");
      setShowPreJoinModal(true);
      return;
    }
    console.log("🚀 Starting RTC meeting...");
    startAndJoinMeetingRtc();

    // Do NOT cleanup on unmount: meeting persists across navigation.
    // Only disconnect on explicit "Leave Meeting" (handleLeaveMeeting calls stopMeetingRtc).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, socket, isConnected, hasJoined]);

  // Request camera/mic when pre-join modal is open (mandatory before join)
  useEffect(() => {
    if (!showPreJoinModal || preJoinStream || preJoinError) return;
    let cancelled = false;
    setPreJoinLoading(true);
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const hasVideo = stream.getVideoTracks().length > 0;
        setPreJoinStream(stream);
        setPreJoinVideoMuted(!hasVideo);
        setPreJoinAudioMuted(false);
        setPreJoinLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreJoinError(err.message || "Could not access camera/microphone.");
          setPreJoinLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showPreJoinModal, preJoinStream, preJoinError]);

  // Attach pre-join stream to preview video element
  useEffect(() => {
    const el = preJoinVideoRef.current;
    const stream = preJoinStream;
    if (!el || !stream) return;
    el.srcObject = stream;
    return () => {
      el.srcObject = null;
    };
  }, [preJoinStream]);

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
    meetingSpeakerMuted,
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
    localStream,
  });

  const { isRecording, startRecording, stopRecording } = useMeetingRecording({
    localStreamRef,
    remoteStreams,
    recordingPayloadRef,
    recordRegionRef,
  });

  // Fetch meeting info to check if user is admin
  const [meetingInfo, setMeetingInfo] = useState(null);
  const isMeetingAdmin = useMemo(() => {
    if (!meetingInfo?.administrator_id || !selfMemberId) return false;
    return String(meetingInfo.administrator_id) === String(selfMemberId);
  }, [meetingInfo?.administrator_id, selfMemberId]);

  useEffect(() => {
    const fetchMeetingInfo = async () => {
      const mid = meetingIdRef.current || meetingId;
      if (!mid) return;
      try {
        const res = await api.get(`/meeting/${mid}`);
        const root = res?.data;
        let meeting;
        if (root?.data) {
          meeting = Array.isArray(root.data)
            ? root.data.find((m) => String(m.id) === String(mid))
            : root.data;
        } else if (root?.id) {
          meeting = root;
        }
        setMeetingInfo(
          meeting
            ? {
              administrator_id: meeting.administrator_id,
              recording: meeting.recording,
              title: meeting.title,
              description: meeting.description,
              group_id: meeting.group_id,
            }
            : null
        );
      } catch (err) {
        console.warn("Could not fetch meeting info:", err);
        setMeetingInfo(null);
      }
    };
    fetchMeetingInfo();
  }, [meetingId]);

  useEffect(() => {
    recordingPayloadRef.current =
      meetingId && meetingInfo
        ? {
          meetingId,
          title: meetingInfo.title,
          group_id: meetingInfo.group_id,
          description: meetingInfo.description,
        }
        : null;
  }, [meetingId, meetingInfo]);

  // Reset recording flag when meeting changes so a new join can start recording again
  useEffect(() => {
    recordingStartedRef.current = false;
  }, [meetingId]);

  // Auto-start recording when: admin + meeting.recording + localStream ready (video element optional — canvas can draw black)
  const recordingEnabled =
    meetingInfo &&
    meetingInfo.recording != null &&
    meetingInfo.recording !== 0 &&
    meetingInfo.recording !== "0";
  useEffect(() => {
    if (
      !hasJoined ||
      !isMeetingAdmin ||
      !recordingEnabled ||
      recordingStartedRef.current ||
      isRecording
    ) {
      return;
    }
    const id = setInterval(() => {
      if (recordingStartedRef.current) return;
      const hasLocalStream = !!localStreamRef.current;
      if (hasLocalStream) {
        recordingStartedRef.current = true;
        clearInterval(id);
        startRecording();
      }
    }, 400);
    return () => clearInterval(id);
  }, [hasJoined, isMeetingAdmin, recordingEnabled, isRecording, startRecording]);

  // On unmount (e.g. tab close, navigate away): stop recording and upload if active
  useEffect(() => {
    return () => {
      const payload = recordingPayloadRef.current;
      if (payload) stopRecording(payload);
    };
  }, [stopRecording]);

  // For admins: separate tiles into members and admin
  const { memberTiles, adminTile } = useMemo(() => {
    if (!isMeetingAdmin) {
      return { memberTiles: unifiedTiles, adminTile: null };
    }
    const members = unifiedTiles.filter(tile => !tile.isSelf);
    const admin = unifiedTiles.find(tile => tile.isSelf);
    return { memberTiles: members, adminTile: admin };
  }, [unifiedTiles, isMeetingAdmin]);

  // For members: find the admin's tile to show in slide2
  const adminTileForMembers = useMemo(() => {
    if (isMeetingAdmin || !meetingInfo?.administrator_id) return null;
    // Find the admin participant by matching administrator_id
    return unifiedTiles.find(tile => {
      const tileUserId = tile?.member_id || tile?.user_id || tile?.userId || tile?.id;
      return tileUserId && String(tileUserId) === String(meetingInfo.administrator_id);
    });
  }, [unifiedTiles, meetingInfo?.administrator_id, isMeetingAdmin]);

  // Reset activeSlide to 0 if admin and currently on slide 2
  useEffect(() => {
    if (isMeetingAdmin && activeSlide > 1) {
      setActiveSlide(0);
    }
  }, [isMeetingAdmin, activeSlide]);

  // For admins, limit activeSlide to 0 or 1 (only 2 screens)
  const handleSetActiveSlide = useCallback((slide) => {
    if (isMeetingAdmin && slide > 1) {
      setActiveSlide(1);
    } else {
      setActiveSlide(slide);
    }
  }, [isMeetingAdmin]);

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

      if (isRecording) {
        await stopRecording({
          meetingId,
          title: meetingInfo?.title,
          group_id: meetingInfo?.group_id,
          description: meetingInfo?.description,
        });
        recordingStartedRef.current = false;
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

  const handlePreJoinClose = useCallback(() => {
    if (preJoinStream) {
      preJoinStream.getTracks().forEach((t) => t.stop());
      setPreJoinStream(null);
    }
    setShowPreJoinModal(false);
    setPreJoinError(null);
    setPreJoinLoading(false);
  }, [preJoinStream]);

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
        preJoinStream.getAudioTracks().forEach((t) => { t.enabled = !next; });
      }
      return next;
    });
  }, [preJoinStream]);

  const handlePreJoinEnter = useCallback(() => {
    if (!preJoinStream) return;
    startAndJoinMeetingRtc({
      preObtainedStream: preJoinStream,
      initialVideoMuted: preJoinVideoMuted,
      initialAudioMuted: preJoinAudioMuted,
    });
    setShowPreJoinModal(false);
    setPreJoinStream(null);
  }, [preJoinStream, preJoinVideoMuted, preJoinAudioMuted, startAndJoinMeetingRtc]);

  const handleMeetingEnded = async () => {
    try {
      console.log("⏰ Meeting has ended, auto-exiting...");
      if (!meetingId) return;

      if (isRecording) {
        await stopRecording({
          meetingId,
          title: meetingInfo?.title,
          group_id: meetingInfo?.group_id,
          description: meetingInfo?.description,
        });
        recordingStartedRef.current = false;
      }

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
      // --- MUTING: just disable the audio tracks ---
      setAudioMuted(true);
      setContextAudioMuted(true);
      const stream = localStreamRef.current;
      if (stream) {
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
      }
    } else {
      // --- UNMUTING: ensure we have audio tracks, then enable them ---
      try {
        // Step 1: أوديو فقط — ما نطلبش فيديو ولا نلمس الشير/الكاميرا
        await ensureMediaTracks({ needAudio: true, needVideo: false });

        const stream = localStreamRef.current;
        if (!stream) {
          setAudioMuted(true);
          setContextAudioMuted(true);
          return;
        }

        // Step 2: Enable all audio tracks
        const audioTracks = stream.getAudioTracks().filter((t) => t.readyState === "live");
        audioTracks.forEach((t) => (t.enabled = true));

        if (audioTracks.length === 0) {
          console.warn("⚠️ No live audio tracks available after ensureMediaTracks");
          setAudioMuted(true);
          setContextAudioMuted(true);
          return;
        }

        // Step 3: Sync tracks with peer connections
        // For each peer, either:
        //   a) The track is already there → just enable it (no renegotiation needed)
        //   b) The track is missing → add it and renegotiate once
        for (const [peerSocketId, pc] of peersRef.current.entries()) {
          if (pc.signalingState === "closed" || pc.connectionState === "closed") continue;

          const existingSenders = pc.getSenders().filter(
            (s) => s.track && s.track.kind === "audio"
          );

          // Remove any ended/stale senders
          for (const sender of existingSenders) {
            if (sender.track.readyState === "ended") {
              try { pc.removeTrack(sender); } catch (e) { /* ignore */ }
            }
          }

          // Get fresh list after cleanup
          const activeSenders = pc.getSenders().filter(
            (s) => s.track && s.track.kind === "audio" && s.track.readyState === "live"
          );

          if (activeSenders.length === 0) {
            // No audio sender → add track and renegotiate
            const trackToAdd = audioTracks[0];
            try {
              pc.addTrack(trackToAdd, stream);
              console.log("➕ Added audio track to peer", peerSocketId);

              // Renegotiate
              if (pc.signalingState === "stable") {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                const mid = meetingIdRef.current;
                if (socket && mid) {
                  socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, () => { });
                  console.log("📤 Sent renegotiation offer for audio to", peerSocketId);
                }
              }
            } catch (err) {
              console.error("❌ Error adding audio track to peer", peerSocketId, err);
            }
          } else {
            // Sender exists → replace with fresh track if needed, or just enable
            const sender = activeSenders[0];
            const freshTrack = audioTracks[0];

            if (sender.track !== freshTrack) {
              try {
                await sender.replaceTrack(freshTrack);
                console.log("🔄 Replaced audio track for peer", peerSocketId);
              } catch (err) {
                console.error("❌ Error replacing audio track for peer", peerSocketId, err);
              }
            }
            // Ensure track is enabled (replaceTrack preserves enabled state)
            if (sender.track) sender.track.enabled = true;
          }
        }

        setAudioMuted(false);
        setContextAudioMuted(false);
      } catch (err) {
        console.error("❌ Failed to unmute audio:", err);
        setAudioMuted(true);
        setContextAudioMuted(true);
        return;
      }
    }

    // Notify other participants of media state change
    const mid = meetingIdRef.current;
    if (socket && mid) {
      socket.emit("updateMediaState", { meetingId: mid, audioMuted: nextMuted, videoMuted });
    }
  };

  const handleToggleVideo = async () => {
    const nextMuted = !videoMuted;
    const mid = meetingIdRef.current;

    if (nextMuted) {
      // --- TURNING CAMERA OFF ---
      setVideoMuted(true);
      setContextVideoMuted(true);
      const cameraTrack = cameraVideoTrackRef.current;
      if (cameraTrack) cameraTrack.enabled = false;
    } else {
      // --- TURNING CAMERA ON ---
      try {
        await ensureMediaTracks({ needVideo: true });
        const cameraTrack = cameraVideoTrackRef.current;
        if (!cameraTrack) {
          console.warn("⚠️ No camera track after ensureMediaTracks");
          setVideoMuted(true);
          setContextVideoMuted(true);
          return;
        }
        cameraTrack.enabled = true;

        const stream = localStreamRef.current;
        // When not screen sharing, we don't need to touch peer senders:
        // disabling/enabling the local camera track is enough for remote peers
        // (track mute/unmute + updateMediaState handle the UI).
        // Only during screen share do we add an extra camera sender.
        if (screenSharing) {
          for (const [peerSocketId, pc] of peersRef.current.entries()) {
            if (pc.signalingState === "closed" || pc.connectionState === "closed") continue;

            const allSenders = pc.getSenders();
            const alreadySendingCamera = allSenders.some((s) => s.track === cameraTrack);

            // أثناء الشير: الـ sender الحالي شير — نضيف كاميرا كـ sender تاني (ما نستبدلش الشير)
            if (!alreadySendingCamera) {
              try {
                pc.addTrack(cameraTrack, stream);
                console.log("➕ Added camera track (while sharing) for peer", peerSocketId);
                if (pc.signalingState === "stable" && !makingOffer.current) {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  if (socket && mid) {
                    socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, () => { });
                  }
                }
              } catch (err) {
                console.warn("⚠️ addTrack (camera while sharing) failed for peer", peerSocketId, err);
              }
            }
          }
        }

        // Update local video element directly so camera shows immediately
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => { });
        }
        if (localVideoRef2.current) {
          localVideoRef2.current.srcObject = stream;
          localVideoRef2.current.play().catch(() => { });
        }
        setLocalStream(stream);

        setVideoMuted(false);
        setContextVideoMuted(false);
      } catch (err) {
        console.error("❌ Failed to turn on camera:", err);
        setVideoMuted(true);
        setContextVideoMuted(true);
        return;
      }
    }

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

    // Send only comment text; backend gets user identity from JWT and broadcasts with real name
    const payload = {
      meetingId: String(currentMeetingId),
      text: trimmedText,
    };

    console.log("Sending meetingChatMessage:", payload);
    console.log("Socket connected:", socket.connected);
    console.log("Socket id:", socket.id);

    const senderId = user?.id || user?.member_id || null;
    // Optimistic message: show "You" only; server echo will replace with backend userName
    const optimisticMessage = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: trimmedText,
      senderName: "You",
      senderId: senderId,
      senderPhoto: null,
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
    setRemoteStreams,
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
    setAudioMuted,
    setContextAudioMuted,
    setLocalParticipantAudioMuted,
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

    // Helper: restore camera after screen share ends
    const restoreCameraAfterScreenShare = async (peers, currentStream) => {
      const cameraTrack = cameraVideoTrackRef.current;
      const mid = meetingIdRef.current;

      // FIX: respect videoMuted state when restoring camera
      if (cameraTrack) {
        cameraTrack.enabled = !videoMuted;
        console.log("📹 Restoring camera track, enabled:", !videoMuted, "(videoMuted:", videoMuted, ")");
      }

      for (const [peerSocketId, pc] of peers.entries()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          try {
            // FIX: pass null if videoMuted so peers see camera as off
            await sender.replaceTrack(videoMuted ? null : (cameraTrack || null));
            // Renegotiate
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (socket && mid) {
                socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, () => { });
              }
            }
          } catch (err) {
            console.error("❌ Error restoring camera for peer", peerSocketId, err);
          }
        }
      }

      const restored = cameraTrack && !videoMuted
        ? new MediaStream([...currentStream.getAudioTracks(), cameraTrack])
        : new MediaStream(currentStream.getAudioTracks());

      localStreamRef.current = restored;
      setLocalStream(restored);
      if (localVideoRef.current) localVideoRef.current.srcObject = restored;
      if (localVideoRef2.current) localVideoRef2.current.srcObject = restored;
    };

    if (!screenSharing) {
      // --- START SCREEN SHARE ---
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: true,
        });

        const screenTrack = displayStream.getVideoTracks()?.[0];
        if (!screenTrack) return;

        screenTrackRef.current = screenTrack;
        setScreenSharing(true);

        const mid = meetingIdRef.current;
        if (socket && mid) socket.emit("screenShareStarted", { meetingId: mid, socketId: socket.id });

        const streamForScreen = new MediaStream([...stream.getAudioTracks(), screenTrack]);

        console.log("🖥️ Adding screen track (camera + screen) for", peersRef.current.size, "peers");

        for (const [peerSocketId, pc] of peersRef.current.entries()) {
          try {
            pc.addTrack(screenTrack, streamForScreen);
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, (ack) => {
                if (ack && !ack.ok) console.error("❌ Screen share add failed:", ack);
              });
            }
          } catch (err) {
            console.error("❌ Failed to add screen track for", peerSocketId, ":", err);
          }
        }

        const cameraTrack = getCameraTrack(stream);
        const newStream = new MediaStream([
          ...stream.getAudioTracks(),
          ...(cameraTrack ? [cameraTrack] : []),
          screenTrack,
        ]);
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        if (localVideoRef2.current) localVideoRef2.current.srcObject = newStream;

        // When user stops sharing from browser UI
        screenTrack.onended = async () => {
          const m = meetingIdRef.current;
          try {
            for (const [peerSocketId, pc] of peersRef.current.entries()) {
              const screenSender = pc.getSenders().find((s) => s.track && isScreenShareVideoTrack(s.track));
              if (screenSender) {
                try {
                  pc.removeTrack(screenSender);
                  if (pc.signalingState === "stable") {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (socket && m) {
                      socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: m, sdp: offer }, () => { });
                    }
                  }
                } catch (err) {
                  console.error("❌ Failed to remove screen track for", peerSocketId, err);
                }
              }
            }
            const cameraTrack = cameraVideoTrackRef.current;
            const restored = cameraTrack && !videoMuted
              ? new MediaStream([...stream.getAudioTracks(), cameraTrack])
              : new MediaStream(stream.getAudioTracks());
            localStreamRef.current = restored;
            setLocalStream(restored);
            if (localVideoRef.current) localVideoRef.current.srcObject = restored;
            if (localVideoRef2.current) localVideoRef2.current.srcObject = restored;
          } finally {
            setScreenSharing(false);
            screenTrackRef.current = null;
            if (socket && m) socket.emit("screenShareStopped", { meetingId: m, socketId: socket.id });
          }
        };
      } catch (e) {
        console.error("❌ Screen share failed:", e);
        smartToast.error("Screen share failed.");
        setScreenSharing(false);
      }
    } else {
      // --- STOP SCREEN SHARE (from our button) ---
      const screenTrack = screenTrackRef.current;
      const mid = meetingIdRef.current;

      if (screenTrack) {
        screenTrack.onended = null;
        for (const [peerSocketId, pc] of peersRef.current.entries()) {
          const screenSender = pc.getSenders().find((s) => s.track && isScreenShareVideoTrack(s.track));
          if (screenSender) {
            try {
              pc.removeTrack(screenSender);
              if (pc.signalingState === "stable") {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                if (socket && mid) {
                  socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, () => { });
                }
              }
            } catch (err) {
              console.error("❌ Failed to remove screen track for", peerSocketId, err);
            }
          }
        }
        screenTrack.stop();
        screenTrackRef.current = null;
      }

      const cameraTrack = cameraVideoTrackRef.current;
      const restored = cameraTrack && !videoMuted
        ? new MediaStream([...stream.getAudioTracks(), cameraTrack])
        : new MediaStream(stream.getAudioTracks());
      localStreamRef.current = restored;
      setLocalStream(restored);
      if (localVideoRef.current) localVideoRef.current.srcObject = restored;
      if (localVideoRef2.current) localVideoRef2.current.srcObject = restored;

      setScreenSharing(false);
      if (socket && mid) socket.emit("screenShareStopped", { meetingId: mid, socketId: socket.id });
      smartToast.success("Screen share stopped.");
    }
  };

  return (
    <div className="meeting-room">
      {/* Pre-join modal: mandatory camera/mic before first join */}
      {showPreJoinModal && (
        <div className="meeting-room-prejoin-overlay">
          <div className="meeting-room-prejoin-modal">
            <h3 className="meeting-room-prejoin-title">Join meeting</h3>
            <p className="meeting-room-prejoin-subtitle">Camera and microphone are required. You can turn them off below before entering.</p>
            {preJoinLoading && (
              <div className="meeting-room-prejoin-loading">
                <span>Requesting camera and microphone…</span>
              </div>
            )}
            {preJoinError && (
              <div className="meeting-room-prejoin-error">
                <p>{preJoinError}</p>
                <button type="button" className="meeting-room-prejoin-retry" onClick={() => { setPreJoinError(null); }}>
                  Try again
                </button>
              </div>
            )}
            {preJoinStream && !preJoinLoading && (
              <>
                <div className="meeting-room-prejoin-preview">
                  <video
                    ref={preJoinVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="meeting-room-prejoin-video"
                    style={{ display: preJoinVideoMuted ? "none" : "block" }}
                  />
                  {preJoinVideoMuted && (
                    <div className="meeting-room-prejoin-video-off">Camera off</div>
                  )}
                </div>
                <div className="meeting-room-prejoin-toggles">
                  <button
                    type="button"
                    className={`meeting-room-prejoin-toggle ${preJoinAudioMuted ? "muted" : ""}`}
                    onClick={handlePreJoinToggleAudio}
                    title={preJoinAudioMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {preJoinAudioMuted ? "🎤 Muted" : "🎤 Microphone on"}
                  </button>
                  <button
                    type="button"
                    className={`meeting-room-prejoin-toggle ${preJoinVideoMuted ? "muted" : ""}`}
                    onClick={handlePreJoinToggleVideo}
                    title={preJoinVideoMuted ? "Turn camera on" : "Turn camera off"}
                  >
                    {preJoinVideoMuted ? "📷 Camera off" : "📷 Camera on"}
                  </button>
                </div>
                <div className="meeting-room-prejoin-actions">
                  <button type="button" className="meeting-room-prejoin-cancel" onClick={handlePreJoinClose}>
                    Cancel
                  </button>
                  <button type="button" className="meeting-room-prejoin-enter" onClick={handlePreJoinEnter}>
                    Enter meeting
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <MeetingRoomHeader
        meetingTitle={meetingTitle}
        onLeaveMeeting={handleLeaveMeeting}
        meetingId={meetingId}
        isRecording={isRecording}
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
        isAdmin={isMeetingAdmin}
        slide0={
          <MeetingRoomGrid
            unifiedTiles={unifiedTiles}
            handRaised={handRaised}
            handRaisedMap={handRaisedMap}
            localVideoRef={localVideoRef}
            remoteVideoRefsMap={remoteVideoRefsMap}
            localParticipantAudioMuted={localParticipantAudioMuted}
            localParticipantVolume={localParticipantVolume}
            meetingSpeakerMuted={meetingSpeakerMuted}
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
        slide2={
          !isMeetingAdmin ? (
            <MeetingRoomScreenPlaceholder
              adminTile={adminTileForMembers}
              remoteVideoRefsMap={remoteVideoRefsMap}
              localParticipantAudioMuted={localParticipantAudioMuted}
              localParticipantVolume={localParticipantVolume}
              meetingSpeakerMuted={meetingSpeakerMuted}
            />
          ) : null
        }
        floatingEmojis={<MeetingRoomFloatingEmojis floatingEmojis={floatingEmojis} />}
      />

      <MeetingRoomSliderDots activeSlide={activeSlide} setActiveSlide={handleSetActiveSlide} isAdmin={isMeetingAdmin} />

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