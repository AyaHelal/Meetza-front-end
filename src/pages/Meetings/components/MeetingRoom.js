import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  HandWaving,
  MonitorArrowUp,
  Smiley,
  ChatCircleDots,
  SignOut,
  ArrowUp,
  ArrowsOut,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import "./MeetingRoom.css";
import api from "../../../API/axiosInstance";
import { smartToast } from "../../../API/toastManager";
import { useSocket } from "../../../context/SocketContext";
import { AuthContext } from "../../../context/AuthContext";
import { useMeetingContext } from "../../../context/MeetingContext";
import { useMediaContext } from "../../../context/MediaContext";

/** Normalize backend participant to unified shape { socketId, member_id, member_name, member_photo, member_email } */
const toParticipant = (p) => ({
  socketId: p?.socketId || p?.id,
  member_id: p?.member_id ?? p?.memberId ?? p?.userId ?? p?.user_id,
  member_name: p?.member_name ?? p?.memberName ?? p?.name,
  member_photo: p?.member_photo ?? p?.memberPhoto ?? p?.photo ?? p?.user_photo,
  member_email: p?.member_email ?? p?.memberEmail ?? p?.email,
});

const MeetingRoom = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream, isScreenShare? }]
  // Load handRaisedMap from localStorage on mount
  const loadHandRaisedMapFromStorage = useCallback((mid) => {
    if (!mid) return {};
    try {
      const stored = localStorage.getItem(`meeting_handRaised_${mid}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load handRaisedMap from localStorage:", error);
    }
    return {};
  }, []);

  const [handRaisedMap, setHandRaisedMap] = useState(() => {
    // Initialize with empty object, will load when meetingId is set
    return {};
  });
  const [mediaStateMap, setMediaStateMap] = useState({}); // { [socketId]: { audioMuted, videoMuted } }
  const [localParticipantAudioMuted, setLocalParticipantAudioMuted] = useState({}); // { [socketId]: boolean } - local mute for each participant
  const [localParticipantVolume, setLocalParticipantVolume] = useState({}); // { [socketId]: number } - 0-1, default 1
  const [meetingTitle, setMeetingTitle] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { socket, isConnected } = useSocket();
  const { user } = useContext(AuthContext);
  const { participants, setParticipants, setMeetingId, setHasJoined, hasJoined, addChatMessage } = useMeetingContext();

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
  // Note: localStreamRef, cameraVideoTrackRef, and screenTrackRef come from MediaContext
  const makingOffer = useRef(false); // Track if we're currently making an offer
  const polite = useRef(new Map()); // socketId -> boolean (true = polite, false = impolite)
  const iceQueueRef = useRef(new Map()); // socketId -> [candidates]
  const createAndSendOfferRef = useRef(null); // Ref to store createAndSendOffer function

  const meetingId = useMemo(() => {
    // Prefer navigation state (set when joining), then query string (?meetingId=...),
    // then sessionStorage (persists across navigation so meeting stays connected)
    const fromLocation =
      location?.state?.meetingId || searchParams.get("meetingId") || null;
    if (fromLocation) return fromLocation;
    try {
      return sessionStorage.getItem("activeMeetingId") || null;
    } catch {
      return null;
    }
  }, [location?.state?.meetingId, searchParams]);

  useEffect(() => {
    meetingIdRef.current = meetingId;
    setMeetingId(meetingId);
    // Also update MediaContext so it knows the meeting ID
    setMediaContextMeetingId(meetingId);
  }, [meetingId, setMeetingId, setMediaContextMeetingId]);

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

  const createPeerConnection = useCallback((peerSocketId) => {
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

    // Monitor connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔗 Peer connection state changed for ${peerSocketId}:`, state);

      if (state === 'failed' || state === 'disconnected') {
        console.warn(`⚠️ Connection ${state} for ${peerSocketId}, attempting to recover...`);
        // Try to recover by creating a new offer if we're impolite
        const isPolite = polite.current.get(peerSocketId);
        if (!isPolite && state === 'failed') {
          setTimeout(() => {
            if (createAndSendOfferRef.current) {
              createAndSendOfferRef.current(peerSocketId).catch(err => {
                console.error("❌ Failed to recover connection:", err);
              });
            }
          }, 1000);
        }
      } else if (state === 'connected') {
        console.log(`✅ Connection established with ${peerSocketId}`);
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`🧊 ICE connection state for ${peerSocketId}:`, iceState);

      if (iceState === 'failed' || iceState === 'disconnected') {
        console.warn(`⚠️ ICE connection ${iceState} for ${peerSocketId}`);
        // ICE failed, might need to restart
        if (iceState === 'failed') {
          // Try to restart ICE
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
        const isScreenShare = vt && (() => {
          try {
            const s = vt.getSettings?.();
            if (s?.displaySurface === "monitor" || s?.displaySurface === "window" || s?.displaySurface === "browser") return true;
            if ((vt.label || "").toLowerCase().includes("screen")) return true;
          } catch { }
          return false;
        })();
        // Always upsert the stream when we receive tracks - this ensures video elements get updated
        upsertRemoteStream(peerSocketId, stream, isScreenShare);

        // Optimistically update media state if we receive enabled tracks
        // vt is already declared above, so we can use it directly
        if (vt && !isScreenShare && vt.enabled && vt.readyState === 'live') {
          setMediaStateMap((prev) => ({
            ...prev,
            [peerSocketId]: {
              ...prev[peerSocketId],
              videoMuted: false, // Camera is on
            },
          }));
        }

        const at = stream.getAudioTracks()[0];
        if (at && at.enabled && at.readyState === 'live') {
          setMediaStateMap((prev) => ({
            ...prev,
            [peerSocketId]: {
              ...prev[peerSocketId],
              audioMuted: false, // Audio is on
            },
          }));
        }

        // Monitor track state changes
        stream.getTracks().forEach(track => {
          track.onended = () => {
            console.warn(`⚠️ Track ended for ${peerSocketId}:`, track.kind);
            // Remove stream if all tracks ended
            if (stream.getTracks().every(t => t.readyState === 'ended')) {
              setRemoteStreams(prev => prev.filter(s => s.socketId !== peerSocketId));
            }
          };
          track.onmute = () => {
            console.log(`🔇 Track muted for ${peerSocketId}:`, track.kind);
            if (track.kind === 'video') {
              setMediaStateMap((prev) => ({
                ...prev,
                [peerSocketId]: { ...prev[peerSocketId], videoMuted: true },
              }));
            } else if (track.kind === 'audio') {
              setMediaStateMap((prev) => ({
                ...prev,
                [peerSocketId]: { ...prev[peerSocketId], audioMuted: true },
              }));
            }
          };
          track.onunmute = () => {
            console.log(`🔊 Track unmuted for ${peerSocketId}:`, track.kind);
            if (track.kind === 'video') {
              setMediaStateMap((prev) => ({
                ...prev,
                [peerSocketId]: { ...prev[peerSocketId], videoMuted: false },
              }));
            } else if (track.kind === 'audio') {
              setMediaStateMap((prev) => ({
                ...prev,
                [peerSocketId]: { ...prev[peerSocketId], audioMuted: false },
              }));
            }
          };
        });
      }
    };

    // Add local tracks if stream is available
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => {
        // Only add tracks that are enabled or if they're audio (audio should always be added)
        // For video, if it's disabled, we still add it but it won't send data until enabled
        if (t.kind === 'video' && !t.enabled) {
          console.log("⚠️ Adding disabled video track to peer", peerSocketId, "- will show black until enabled");
        }
        console.log("➕ Adding local track to peer", peerSocketId, { kind: t.kind, enabled: t.enabled });
        pc.addTrack(t, stream);
      });
    } else {
      console.warn("⚠️ Local stream not ready when creating peer connection for", peerSocketId);
    }

    // Register peer connection in MediaContext so it can trigger renegotiation even when not on meeting page
    registerPeerConnection(peerSocketId, pc);

    return pc;
  }, [socket, upsertRemoteStream, registerPeerConnection]);

  // Add tracks to all existing peer connections when local stream becomes available
  const addTracksToAllPeers = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    for (const [peerSocketId, pc] of peersRef.current.entries()) {
      // Skip if connection is not in a stable state (negotiating)
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer' && pc.signalingState !== 'have-remote-offer') {
        console.log("⏸️ Skipping track addition for", peerSocketId, "- connection is negotiating (state:", pc.signalingState + ")");
        continue;
      }

      const senders = pc.getSenders();
      const hasVideo = senders.some(s => s.track && s.track.kind === 'video');
      const hasAudio = senders.some(s => s.track && s.track.kind === 'audio');

      // Only add tracks if they're truly missing and connection is stable
      const streamHasVideo = stream.getVideoTracks().length > 0;
      const streamHasAudio = stream.getAudioTracks().length > 0;

      const needsVideo = streamHasVideo && !hasVideo;
      const needsAudio = streamHasAudio && !hasAudio;

      if (needsVideo || needsAudio) {
        console.log("🔄 Adding missing tracks to peer", peerSocketId, { needsVideo, needsAudio });
        let addedAny = false;
        stream.getTracks().forEach((t) => {
          const existing = senders.find(s => s.track && s.track.kind === t.kind);
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

        // Only trigger renegotiation if we actually added tracks and connection is stable
        if (addedAny && pc.signalingState === 'stable' && !makingOffer.current) {
          // Use a small delay to batch multiple track additions
          setTimeout(() => {
            // Double-check state is still stable before renegotiating
            if (pc.signalingState === 'stable' && !makingOffer.current) {
              pc.createOffer().then(offer => {
                return pc.setLocalDescription(offer);
              }).then(() => {
                const mid = meetingIdRef.current;
                if (socket && mid) {
                  socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: pc.localDescription }, () => { });
                  console.log("📤 Renegotiated after adding tracks to", peerSocketId);
                }
              }).catch(err => {
                if (err.name !== "InvalidStateError") {
                  console.error("❌ Error renegotiating after adding tracks:", err);
                }
              });
            }
          }, 100);
        }
      }
    }
  }, [socket]);

  /** Get user media only when needed. Does NOT auto-enable - respects audioMuted/videoMuted. */
  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      // If stream exists but has no tracks, ensure we have at least audio for WebRTC negotiation
      const stream = localStreamRef.current;
      if (stream.getTracks().length === 0) {
        // Always request audio (even if muted) to ensure WebRTC negotiation works
        // This allows us to receive remote tracks even when camera/mic are off
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          mediaStream.getAudioTracks().forEach((t) => {
            t.enabled = false; // Keep it disabled (muted)n but present for negotiation
            stream.addTrack(t);
          });
          console.log("✅ Added muted audio track for WebRTC negotiation");
        } catch (e) {
          console.warn("⚠️ Could not get audio track for negotiation:", e);
        }
      }
      return stream;
    }

    // Start with empty stream - media activated only when user explicitly enables
    // However, we need at least one track for WebRTC negotiation to work properly
    const stream = new MediaStream();

    // Always request audio (even if muted) to ensure WebRTC negotiation works
    // This allows us to receive remote tracks even when camera/mic are off
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      mediaStream.getAudioTracks().forEach((t) => {
        t.enabled = false; // Keep it disabled (muted) but present for negotiation
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
  }, []);

  // Create and send offer to a peer (only if we're the impolite peer)
  const createAndSendOffer = useCallback(async (targetSocketId) => {
    const pc = peersRef.current.get(targetSocketId);
    if (!pc) {
      console.warn("⚠️ Cannot create offer - no peer connection for", targetSocketId);
      return;
    }

    try {
      makingOffer.current = true;
      console.log("📤 Creating offer for", targetSocketId);

      // Ensure local stream has tracks - this is critical for WebRTC negotiation
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

      // Ensure local tracks are added to peer connection
      if (stream) {
        stream.getTracks().forEach((t) => {
          const existing = pc.getSenders().find(s => s.track && s.track.kind === t.kind);
          if (!existing) {
            console.log("➕ Adding track to peer connection before offer:", { kind: t.kind, enabled: t.enabled });
            pc.addTrack(t, stream);
          }
        });
      } else {
        console.warn("⚠️ No local stream available - offer may fail");
      }

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for track addition
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const mid = meetingIdRef.current;
      socket.emit(
        "webrtcOffer",
        { toSocketId: targetSocketId, meetingId: mid, sdp: offer },
        (ack) => {
          if (ack && !ack.ok) {
            console.error("❌ Offer send failed:", ack);
          } else {
            console.log("✅ Offer sent successfully to", targetSocketId);
          }
        }
      );
    } catch (err) {
      console.error("❌ Error creating/sending offer:", err);
    } finally {
      makingOffer.current = false;
    }
  }, [socket, ensureLocalMedia]);

  // Update ref when createAndSendOffer changes
  useEffect(() => {
    createAndSendOfferRef.current = createAndSendOffer;
  }, [createAndSendOffer]);

  /** Get camera track only (exclude screen share) from stream. */
  const getCameraTrack = useCallback((stream) => {
    if (!stream) return null;
    for (const t of stream.getVideoTracks()) {
      try {
        const s = t.getSettings?.();
        if (s?.displaySurface === "monitor" || s?.displaySurface === "window" || s?.displaySurface === "browser") continue;
        if ((t.label || "").toLowerCase().includes("screen")) continue;
        return t;
      } catch { return t; }
    }
    return null;
  }, []);

  /** Call when user enables mic or camera - gets actual media and adds to stream. */
  const ensureMediaTracks = useCallback(async (options = {}) => {
    const needAudio = options.needAudio ?? !audioMuted;
    const needVideo = options.needVideo ?? !videoMuted;
    let stream = localStreamRef.current;
    if (!stream) stream = await ensureLocalMedia();

    // Check if we have enabled audio tracks (not just disabled ones)
    const audioTracks = stream.getAudioTracks();
    const hasEnabledAudio = audioTracks.some(t => t.enabled && t.readyState === 'live');
    const hasAudio = audioTracks.length > 0;

    const hasCamera = !!getCameraTrack(stream);

    // If we need audio but don't have enabled audio tracks, get new ones
    // This handles the case where we have disabled tracks from ensureLocalMedia
    if (needAudio && (!hasAudio || !hasEnabledAudio)) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });

        // Remove old disabled audio tracks if they exist
        // Also remove them from peer connections before adding new ones
        if (hasAudio && !hasEnabledAudio) {
          // First, remove tracks from peer connections
          for (const [, pc] of peersRef.current.entries()) {
            const audioSenders = pc.getSenders().filter(s => s.track && s.track.kind === 'audio');
            audioSenders.forEach(sender => {
              try {
                sender.track.stop();
                pc.removeTrack(sender);
                console.log("🗑️ Removed old audio track from peer connection");
              } catch (err) {
                console.error("❌ Error removing old audio track:", err);
              }
            });
          }

          // Then remove from stream
          audioTracks.forEach(t => {
            t.stop();
            stream.removeTrack(t);
          });
          console.log("🗑️ Removed disabled audio tracks before adding new ones");
        }

        // Add new enabled audio tracks
        const newAudioTracks = [];
        mediaStream.getAudioTracks().forEach((t) => {
          t.enabled = true;
          stream.addTrack(t);
          newAudioTracks.push(t);
          console.log("✅ Added enabled audio track to stream");
        });

        // Note: Don't add tracks to peer connections here - let handleToggleAudio do it
        // This avoids duplicate track issues and ensures proper renegotiation
      } catch (e) {
        console.error("getUserMedia failed for audio:", e);
        throw e;
      }
    }

    // Handle video tracks
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

    // If we added audio tracks, ensure they're added to all peers
    if (needAudio && (!hasAudio || !hasEnabledAudio)) {
      setTimeout(() => addTracksToAllPeers(), 100);
    }

    return stream;
  }, [audioMuted, videoMuted, ensureLocalMedia, addTracksToAllPeers, getCameraTrack]);

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
              // Check if it's a screen share
              const videoTrack = restoredStream.getVideoTracks()[0];
              const isScreenShare = videoTrack && (() => {
                try {
                  const s = videoTrack.getSettings?.();
                  if (s?.displaySurface === "monitor" || s?.displaySurface === "window" || s?.displaySurface === "browser") return true;
                  if ((videoTrack.label || "").toLowerCase().includes("screen")) return true;
                } catch { }
                return false;
              })();

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

  // Attach stream to both video elements when it changes (incl. when screen share starts)
  useEffect(() => {
    const stream = localStreamRef.current;
    const videoEl1 = localVideoRef.current;
    const videoEl2 = localVideoRef2.current;

    if (stream) {
      // Always update srcObject to ensure video elements show the latest stream
      if (videoEl1) {
        videoEl1.srcObject = stream;
      }
      if (videoEl2) {
        videoEl2.srcObject = stream;
      }
    }
  }, [videoMuted, audioMuted, screenSharing]);

  // Sync videoMuted/audioMuted to track enabled state (camera only for video - never touch screen share)
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const cameraTrack = cameraVideoTrackRef.current;
    if (cameraTrack) cameraTrack.enabled = !videoMuted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !audioMuted));
  }, [videoMuted, audioMuted]);

  // Restore camera/mic state on mount if they were enabled before refresh
  useEffect(() => {
    if (!hasJoined || !localStreamRef.current) return;

    const restoreMediaState = async () => {
      try {
        // If video was unmuted (camera was on), request camera track
        if (!videoMuted) {
          const cameraTrack = cameraVideoTrackRef.current;
          if (!cameraTrack) {
            console.log("📹 Restoring camera after refresh...");
            await ensureMediaTracks({ needVideo: true });
            const restoredTrack = cameraVideoTrackRef.current;
            if (restoredTrack) {
              restoredTrack.enabled = true;
              // Force update video elements to show the restored camera
              const stream = localStreamRef.current;
              if (stream) {
                setTimeout(() => {
                  if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                  }
                  if (localVideoRef2.current) {
                    localVideoRef2.current.srcObject = stream;
                  }
                }, 100);
              }
            }
          } else {
            cameraTrack.enabled = true;
            // Force update video elements
            const stream = localStreamRef.current;
            if (stream) {
              setTimeout(() => {
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = stream;
                }
                if (localVideoRef2.current) {
                  localVideoRef2.current.srcObject = stream;
                }
              }, 100);
            }
          }
        }

        // If audio was unmuted (mic was on), request audio track
        if (!audioMuted) {
          const hasAudio = localStreamRef.current.getAudioTracks().length > 0;
          if (!hasAudio) {
            console.log("🎤 Restoring microphone after refresh...");
            await ensureMediaTracks({ needAudio: true });
          }
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
        }
      } catch (error) {
        console.warn("⚠️ Failed to restore media state after refresh:", error);
      }
    };

    restoreMediaState();
  }, [hasJoined, videoMuted, audioMuted, ensureMediaTracks]);

  // Socket listeners (signaling) - participants are socket-driven, no REST fetch
  useEffect(() => {
    if (!socket) return;

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
      // Build participant entry from backend payload (userId, name, user_photo)
      const entry = toParticipant({
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

      // Ensure local stream has tracks before creating peer connection
      // This is critical for WebRTC negotiation to work properly
      let stream = localStreamRef.current;
      if (!stream || stream.getTracks().length === 0) {
        console.log("🔄 Ensuring local media has tracks before creating peer connection...");
        try {
          await ensureLocalMedia();
          stream = localStreamRef.current;
        } catch (e) {
          console.error("❌ Failed to ensure local media:", e);
        }
      }

      console.log("🔗 Creating peer connection for new participant", peerSocketId);
      const pc = createPeerConnection(peerSocketId);
      peersRef.current.set(peerSocketId, pc);

      // Determine polite/impolite based on socket.id comparison
      // The peer with smaller socket.id is impolite (initiates offer)
      if (socket.id < peerSocketId) {
        polite.current.set(peerSocketId, false); // We are impolite
        console.log("🔵 We are impolite for new participant", peerSocketId, "(our id is smaller)");
        // We initiate the offer
        await createAndSendOffer(peerSocketId);
      } else {
        polite.current.set(peerSocketId, true); // We are polite
        console.log("🟢 We are polite for new participant", peerSocketId, "(their id is smaller)");
        // We wait for their offer
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
        // Persist to localStorage
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
      const sdp = data?.sdp || data?.offer; // Support both 'sdp' and 'offer' field names
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
        pc = createPeerConnection(fromSocketId);
        peersRef.current.set(fromSocketId, pc);
        // Set polite flag based on socket.id comparison
        if (socket.id < fromSocketId) {
          polite.current.set(fromSocketId, false); // We are impolite
        } else {
          polite.current.set(fromSocketId, true); // We are polite
        }
      }

      // Check for offer collision
      const isPolite = polite.current.get(fromSocketId) ?? true; // Default to polite
      const offerCollision = makingOffer.current || pc.signalingState !== "stable";
      const ignoreOffer = !isPolite && offerCollision;

      if (ignoreOffer) {
        console.log("⚠️ Ignoring offer due to collision (we are impolite and making offer):", fromSocketId);
        return;
      }

      try {
        console.log("📥 Setting remote offer from", fromSocketId, "state:", pc.signalingState);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Process queued ICE candidates after setting remote description
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

        // Only set remote description if we're in the right state
        if (currentState === "have-local-offer") {
          console.log("✅ Setting remote answer for", fromSocketId, "current state:", currentState);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Process queued ICE candidates after setting remote description
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
          // If we're stable but don't have a remote description yet, try to set it
          console.log("⚠️ Setting remote answer in stable state (no remote desc yet) for", fromSocketId);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Process queued ICE candidates
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
          // Already have remote description, might be a duplicate answer
          console.log("ℹ️ Ignoring duplicate answer - already have remote description for", fromSocketId);
        } else {
          console.warn("⚠️ Cannot set remote answer - wrong state:", currentState, "for", fromSocketId);
        }
      } catch (err) {
        // If it's just a state error and we already have a connection, it's okay
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

      // If remote description is not set yet, queue the candidate
      if (!pc.remoteDescription) {
        if (!iceQueueRef.current.has(fromSocketId)) {
          iceQueueRef.current.set(fromSocketId, []);
        }
        iceQueueRef.current.get(fromSocketId).push(candidate);
        console.log("📦 Queued ICE candidate for", fromSocketId, "queue size:", iceQueueRef.current.get(fromSocketId).length);
        return;
      }

      // If we have remote description, add the candidate immediately
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ Added ICE candidate for", fromSocketId);
      } catch (err) {
        // If it's just a state error and connection is already established, it's okay
        if (err.name === "InvalidStateError" && pc.connectionState !== "new") {
          console.log("ℹ️ ICE candidate received but connection already established for", fromSocketId);
        } else if (err.name === "OperationError" && err.message?.includes("already exists")) {
          // Duplicate candidate, ignore
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
        // Persist to localStorage
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

        // Skip if this is our own reaction (already added optimistically)
        if (fromSocketId === socket.id || (selfMemberId && String(fromMemberId) === String(selfMemberId))) {
          return;
        }

        const meta = fromSocketId ? peerMetaRef.current.get(fromSocketId) : null;
        const fromName = data?.name ?? data?.member_name ?? meta?.member_name ?? "Someone";
        const key = String(fromMemberId || fromSocketId || fromName);
        addReactionToMap(key, type, fromName);

        // Trigger floating emoji animation for reactions from others
        // Convert type to emoji character using getReactionIcon
        const emojiChar = getReactionIcon(type);
        spawnFloatingEmojis(emojiChar, fromName, 1);
      } catch (e) {
        console.error("❌ Error handling reaction event:", e, data);
      }
    };
    socket.on("reaction", onReaction);
    // Also listen for alternative event names in case backend uses different naming
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

  const getPeerLabel = useCallback((socketId) => {
    const meta = peerMetaRef.current.get(socketId);
    return meta?.member_name || meta?.member_id || socketId;
  }, []);

  const selfMemberId = useMemo(() => user?.id || user?.member_id || null, [user?.id, user?.member_id]);
  const selfEmail = useMemo(() => user?.email || null, [user?.email]);
  const selfPhoto = useMemo(
    () => user?.user_photo || user?.photo || user?.member_photo || null,
    [user?.user_photo, user?.photo, user?.member_photo]
  );
  // Load reactions from localStorage on mount
  const loadReactionsFromStorage = useCallback((mid) => {
    if (!mid) return {};
    try {
      const stored = localStorage.getItem(`meeting_reactions_${mid}`);
      if (stored) {
        const reactions = JSON.parse(stored);
        // Filter out reactions older than 24 hours (optional cleanup)
        const oneDayAgo = Date.now() - 60 * 1000;
        const filtered = {};
        Object.entries(reactions).forEach(([memberKey, reactionEntry]) => {
          const filteredEntry = {};
          Object.entries(reactionEntry).forEach(([type, data]) => {
            const timestamp = typeof data === 'object' && data.timestamp ? data.timestamp : 0;
            if (timestamp > oneDayAgo) {
              filteredEntry[type] = data;
            }
          });
          if (Object.keys(filteredEntry).length > 0) {
            filtered[memberKey] = filteredEntry;
          }
        });
        return filtered;
      }
    } catch (error) {
      console.warn("Failed to load reactions from localStorage:", error);
    }
    return {};
  }, []);

  const [reactionsMap, setReactionsMap] = useState(() => {
    // Initialize with empty object, will load when meetingId is set
    return {};
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiList = ["👍", "❤️", "😂", "👏", "😮", "🎉"];
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  const getReactionIcon = (type) => {
    if (typeof type !== "string") return "👍";
    try {
      if (/[\p{Emoji}]/u.test(type)) return type;
    } catch {
      if (/[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]?/.test(type)) return type;
    }
    const map = { like: "👍", heart: "❤️", laugh: "😂", clap: "👏", wow: "😮", celebration: "🎉" };
    return map[type.toLowerCase?.()] || type;
  };

  /** One tile per participant. Priority: screen share > camera > profile. */
  const unifiedTiles = useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    return list.map((p) => {
      const sid = p?.socketId || p?.id;
      const isSelf = sid === socket?.id || (selfMemberId && String(p?.member_id) === String(selfMemberId));
      let stream = null;
      let isScreenShare = false;
      if (isSelf) {
        stream = localStreamRef.current;
        isScreenShare = screenSharing;
      } else {
        const entry = remoteStreams.find((x) => x.socketId === sid);
        stream = entry?.stream ?? null;
        isScreenShare = entry?.isScreenShare ?? false;
      }
      // Check mediaStateMap for remote participants' camera state
      // Default to muted (true) if no state is known - we'll show camera only when explicitly unmuted
      const remoteMediaState = !isSelf ? mediaStateMap[sid] : null;
      const remoteVideoMuted = remoteMediaState?.videoMuted ?? true; // Default to muted (camera off)

      // Only show video if stream exists AND has video tracks AND camera is not muted
      const hasVideoTracks = stream && stream.getVideoTracks().length > 0;
      const showVideo = stream && hasVideoTracks && (
        isSelf
          ? (!videoMuted || isScreenShare)
          : (!remoteVideoMuted || isScreenShare) // For remote: check mediaStateMap
      );
      return {
        ...p,
        isSelf,
        stream: showVideo ? stream : null,
        isScreenShare,
        label: p?.member_name || p?.member_email || "Participant",
        // Ensure member_photo is included from participant data
        member_photo: p?.member_photo || p?.memberPhoto || p?.user_photo || p?.photo || null,
      };
    });
  }, [participants, remoteStreams, socket?.id, selfMemberId, videoMuted, screenSharing, mediaStateMap]);

  const screenShareFullscreenRef = useRef(null);
  const memberVideoFullscreenRef = useRef(null);
  const fullscreenStreamRef = useRef(null); // Store stable stream reference for fullscreen
  const fullscreenSocketIdRef = useRef(null); // Track which socketId is in fullscreen
  const screenShareVideoRef = useRef(null);
  const memberVideoVideoRef = useRef(null);
  const remoteVideoRefsMap = useRef(new Map()); // socketId -> video element (for local audio control sync)

  const toggleFullscreenForScreenShare = useCallback((tile) => {
    if (!tile?.isScreenShare || tile?.isSelf || !tile?.stream) return;
    const el = screenShareFullscreenRef.current;
    const video = screenShareVideoRef.current;
    if (!el || !video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    // Store stable references
    fullscreenStreamRef.current = tile.stream;
    fullscreenSocketIdRef.current = tile.socketId;

    el.style.visibility = "visible";
    el.style.pointerEvents = "auto";

    // Set stream and ensure it plays smoothly
    video.srcObject = tile.stream;
    video.muted = !!localParticipantAudioMuted[tile.socketId];
    video.volume = localParticipantVolume[tile.socketId] ?? 1;

    // Use a small delay to ensure stream is ready before fullscreen
    setTimeout(() => {
      video.play?.().then(() => {
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      }).catch(() => {
        // Even if play fails, try fullscreen
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      });
    }, 50);
  }, [localParticipantAudioMuted, localParticipantVolume]);

  const toggleFullscreenForMember = useCallback((tile) => {
    if (tile?.isSelf || !tile?.stream) return;
    const el = memberVideoFullscreenRef.current;
    const video = memberVideoVideoRef.current;
    if (!el || !video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    // Store stable references
    fullscreenStreamRef.current = tile.stream;
    fullscreenSocketIdRef.current = tile.socketId;

    el.style.visibility = "visible";
    el.style.pointerEvents = "auto";

    // Set stream and ensure it plays smoothly
    video.srcObject = tile.stream;
    video.muted = !!localParticipantAudioMuted[tile.socketId];
    video.volume = localParticipantVolume[tile.socketId] ?? 1;

    // Use a small delay to ensure stream is ready before fullscreen
    setTimeout(() => {
      video.play?.().then(() => {
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      }).catch(() => {
        // Even if play fails, try fullscreen
        el.requestFullscreen?.().then(() => { }).catch(() => { });
      });
    }, 50);
  }, [localParticipantAudioMuted, localParticipantVolume]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (screenShareFullscreenRef.current) {
          const el = screenShareFullscreenRef.current;
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          const v = screenShareVideoRef.current;
          if (v) {
            // Pause before clearing to prevent flicker
            v.pause();
            v.srcObject = null;
          }
        }
        if (memberVideoFullscreenRef.current) {
          const el = memberVideoFullscreenRef.current;
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          const v = memberVideoVideoRef.current;
          if (v) {
            // Pause before clearing to prevent flicker
            v.pause();
            v.srcObject = null;
          }
        }
        // Clear the stored references
        fullscreenStreamRef.current = null;
        fullscreenSocketIdRef.current = null;
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
    };
  }, []);

  // Keep fullscreen video synchronized with stream updates, but be very conservative to prevent flickering
  // Only update if the stream is completely missing or the video element has no stream
  useEffect(() => {
    if (!document.fullscreenElement || !fullscreenSocketIdRef.current) return;

    const video = screenShareVideoRef.current || memberVideoVideoRef.current;
    if (!video) return;

    // Find the current stream for the fullscreen socketId
    const streamEntry = remoteStreams.find(s => s.socketId === fullscreenSocketIdRef.current);

    // If stream is missing and video has no srcObject, that's fine - don't update
    if (!streamEntry?.stream) {
      // Only update if video has a stream but the remote stream is gone
      if (video.srcObject && !fullscreenStreamRef.current) {
        // Stream was lost, but we'll keep showing the last frame
        return;
      }
      return;
    }

    const currentStream = streamEntry.stream;

    // Only update if video has no srcObject at all (initial setup)
    // OR if the current stream is completely different (different track IDs)
    if (!video.srcObject) {
      // Initial setup - set the stream
      video.srcObject = currentStream;
      fullscreenStreamRef.current = currentStream;
      video.play?.().catch(() => { });
    } else if (fullscreenStreamRef.current && fullscreenStreamRef.current !== currentStream) {
      // Stream reference changed - check if tracks are actually different
      const oldTracks = fullscreenStreamRef.current.getVideoTracks() || [];
      const newTracks = currentStream.getVideoTracks() || [];

      // Only update if track IDs are different (meaning it's a truly different stream)
      const trackIdsChanged = oldTracks.length !== newTracks.length ||
        oldTracks.some((t, i) => t.id !== newTracks[i]?.id);

      if (trackIdsChanged) {
        // Tracks are different - update the stream
        video.srcObject = currentStream;
        fullscreenStreamRef.current = currentStream;
        video.play?.().catch(() => { });
      }
      // If tracks are the same, don't update - prevents flickering from stream object recreation
    }
  }, [remoteStreams]);

  // Sync local participant audio control to fullscreen video when in fullscreen
  useEffect(() => {
    const sid = fullscreenSocketIdRef.current;
    if (!sid || !document.fullscreenElement) return;
    const video = screenShareVideoRef.current || memberVideoVideoRef.current;
    if (!video) return;
    video.muted = !!localParticipantAudioMuted[sid];
    video.volume = localParticipantVolume[sid] ?? 1;
  }, [localParticipantAudioMuted, localParticipantVolume]);

  const getParticipantStream = useCallback(
    (participant) => {
      const memberId = participant?.member_id;
      const email = participant?.member_email;

      // Try to match REST participant -> socketId via metadata received in socket events/acks
      for (const [socketId, meta] of peerMetaRef.current.entries()) {
        if (memberId && meta?.member_id && String(meta.member_id) === String(memberId)) {
          const stream = remoteStreams.find((x) => x.socketId === socketId)?.stream;
          if (stream) {
            console.log("✅ Matched participant by member_id:", memberId, "to socketId:", socketId);
            return stream;
          }
        }
        // Also try matching by email
        if (email && meta?.member_email && String(meta.member_email).toLowerCase() === String(email).toLowerCase()) {
          const stream = remoteStreams.find((x) => x.socketId === socketId)?.stream;
          if (stream) {
            console.log("✅ Matched participant by email:", email, "to socketId:", socketId);
            return stream;
          }
        }
      }

      // If no match found, log for debugging
      if (memberId || email) {
        console.warn("⚠️ Could not match participant to stream:", { memberId, email, availableStreams: remoteStreams.length, availableMeta: Array.from(peerMetaRef.current.keys()) });
      }
      return null;
    },
    [remoteStreams]
  );

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

  // Socket listener for meeting end event
  useEffect(() => {
    if (!socket) return;

    const onMeetingEnded = (data) => {
      const mid = data?.meetingId;
      if (!mid || mid !== meetingIdRef.current) return;
      handleMeetingEnded();
    };

    socket.on("meetingEnded", onMeetingEnded);

    return () => {
      socket.off("meetingEnded", onMeetingEnded);
    };
  }, [socket]);

  // Fetch meeting title from API when meetingId changes
  useEffect(() => {
    if (!meetingId) {
      setMeetingTitle("");
      return;
    }
    const fetchMeetingTitle = async () => {
      try {
        const res = await api.get(`/meeting/${meetingId}`);
        const root = res?.data;
        let meeting;
        if (root?.data) {
          meeting = Array.isArray(root.data)
            ? root.data.find((m) => String(m.id) === String(meetingId))
            : root.data;
        } else if (root?.id) {
          meeting = root;
        }
        setMeetingTitle(meeting?.title || "");
      } catch {
        setMeetingTitle("");
      }
    };
    fetchMeetingTitle();
  }, [meetingId]);

  // Periodically check if meeting is still active (every 10 seconds)
  useEffect(() => {
    if (!meetingId) return;

    const checkMeetingStatus = async () => {
      try {
        const res = await api.get(`/meeting/${meetingId}`);
        const root = res?.data;

        // Handle response format from API
        // Response could be: { success: true, data: {...} } or { success: true, data: [{...}] }
        let meeting;
        if (root?.data) {
          // If data is an array, find the meeting with matching ID
          if (Array.isArray(root.data)) {
            meeting = root.data.find(m => m.id === meetingId);
          } else {
            // If data is an object, use it directly
            meeting = root.data;
          }
        } else {
          // Fallback: use root as meeting if it has required fields
          meeting = root?.id ? root : null;
        }

        if (!meeting) {
          console.log("⏰ Meeting not found, ending...");
          handleMeetingEnded();
          return;
        }

        // console.log("📋 Meeting data:", {
        //   id: meeting.id,
        //   status: meeting.status,
        //   end_time: meeting.end_time,
        //   start_time: meeting.start_time
        // });

        const status = meeting?.status || "";
        const normalizedStatus = (status || "").toString().trim().toLowerCase();

        // If meeting is finished, ended, or closed, end the session
        if (["finished", "ended", "closed"].includes(normalizedStatus)) {
          console.log("⏰ Meeting status is", normalizedStatus, ", ending...");
          handleMeetingEnded();
          return;
        }

        // Check if end_time has passed
        const endTime = meeting?.end_time;
        if (endTime) {
          const endDateTime = new Date(endTime);
          const now = new Date();
          const timeUntilEnd = endDateTime - now;

          if (now >= endDateTime) {
            console.log("⏰ Meeting end time reached, ending...");
            handleMeetingEnded();
            return;
          }
        }
      } catch (error) {
        // If API returns 404 or error, meeting likely ended
        if (error.response?.status === 404) {
          console.log("⏰ Meeting not found (404), ending...");
          handleMeetingEnded();
        } else {
          console.warn("⚠️ Could not check meeting status:", error);
        }
      }
    };

    const interval = setInterval(checkMeetingStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [meetingId]);

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

  // Sync local participant audio control (muted/volume) to video elements when state changes
  useEffect(() => {
    remoteVideoRefsMap.current.forEach((el, socketId) => {
      if (el) {
        el.muted = !!localParticipantAudioMuted[socketId];
        el.volume = localParticipantVolume[socketId] ?? 1;
        // Ensure video is playing after audio state change
        if (el.paused && el.srcObject) {
          el.play().catch(err => {
            console.warn("⚠️ Failed to play video after audio state change:", err);
          });
        }
      }
    });
  }, [localParticipantAudioMuted, localParticipantVolume]);

  // Ensure remote videos play when streams are updated
  useEffect(() => {
    remoteStreams.forEach(({ socketId, stream }) => {
      const videoEl = remoteVideoRefsMap.current.get(socketId);
      if (videoEl && stream) {
        // Update srcObject if it changed
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          console.log("🔄 Updated video srcObject for", socketId);
        }
        // Ensure it's playing
        if (videoEl.paused) {
          videoEl.play().catch(err => {
            console.warn("⚠️ Failed to play video for", socketId, ":", err);
          });
        }
      }
    });
  }, [remoteStreams]);

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

  const toggleFullscreenForElement = (el) => {
    if (!el) return;
    const doc = document;
    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
    if (isFullscreen) {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exit) exit.call(doc);
    } else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) req.call(el);
    }
  };

  const isScreenShareStream = (stream) => {
    if (!stream) return false;
    return stream.getVideoTracks().some((t) => {
      try {
        const s = t.getSettings?.();
        if (s?.displaySurface === "monitor" || s?.displaySurface === "window" || s?.displaySurface === "browser") {
          return true;
        }
        const label = (t.label || "").toLowerCase();
        return label.includes("screen") || label.includes("display");
      } catch {
        return false;
      }
    });
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

  const spawnFloatingEmojis = useCallback((emoji, name, count = 1) => {
    // Create only one emoji that animates upward from control bar area
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    // Position at center horizontally, near the control bar (above bottom)
    const left = window.innerWidth / 2; // Center horizontally
    const top = window.innerHeight - 150; // Above control bar area
    const item = { id, emoji, name, left, top };

    setFloatingEmojis((prev) => [...prev, item]);
    // Remove after animation completes (3s)
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((f) => f.id !== item.id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const onDocClick = (ev) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(ev.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showEmojiPicker]);

  const addReactionToMap = useCallback((memberKey, type, name) => {
    setReactionsMap((prev) => {
      const next = { ...prev };
      const entry = next[memberKey] ? { ...next[memberKey] } : {};
      // Store reaction with timestamp for ordering
      entry[type] = { name, timestamp: Date.now() };
      next[memberKey] = entry;

      // Persist to localStorage
      const currentMeetingId = meetingIdRef.current;
      if (currentMeetingId) {
        try {
          localStorage.setItem(`meeting_reactions_${currentMeetingId}`, JSON.stringify(next));
        } catch (error) {
          console.warn("Failed to save reactions to localStorage:", error);
        }
      }

      return next;
    });
  }, []);

  // Load reactions from localStorage when meetingId is set
  useEffect(() => {
    if (meetingId) {
      const storedReactions = loadReactionsFromStorage(meetingId);
      if (Object.keys(storedReactions).length > 0) {
        setReactionsMap(storedReactions);
      } else {
        setReactionsMap({});
      }

      // Load handRaisedMap from localStorage
      const storedHandRaised = loadHandRaisedMapFromStorage(meetingId);
      if (Object.keys(storedHandRaised).length > 0) {
        setHandRaisedMap(storedHandRaised);
      } else {
        setHandRaisedMap({});
      }
    } else {
      setReactionsMap({});
      setHandRaisedMap({});
    }
  }, [meetingId, loadReactionsFromStorage, loadHandRaisedMapFromStorage]);


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
      {/* Header */}
      <div className="meeting-room-header">
        <div className="meeting-room-title-wrap">
          <h1 className="meeting-room-title">Meeting room</h1>
          <p className="meeting-room-subtitle">{meetingTitle || "Meeting"}</p>
        </div>
        <button
          type="button"
          className="meeting-room-expand-btn"
          aria-label="Leave meeting"
          onClick={handleLeaveMeeting}
          disabled={!meetingId}
          title={!meetingId ? "Missing meeting id" : "Leave meeting"}
        >
          <SignOut size={20} weight="bold" />
        </button>
      </div>

      {/* Dedicated fullscreen video for remote screen share - set srcObject before fullscreen to avoid black screen */}
      <div
        ref={screenShareFullscreenRef}
        className="meeting-room-fullscreen-video"
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", pointerEvents: "none", visibility: "hidden" }}
      >
        <video
          ref={screenShareVideoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Dedicated fullscreen video for remote member videos */}
      <div
        ref={memberVideoFullscreenRef}
        className="meeting-room-fullscreen-video"
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", pointerEvents: "none", visibility: "hidden" }}
      >
        <video
          ref={memberVideoVideoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      <div className="meeting-room-slider-viewport" ref={sliderViewportRef}>
        <div
          className={`meeting-room-slider-track ${activeSlide === 1 ? 'single-view' : ''}`}
          style={{ transform: `translateX(-${activeSlide * (100 / 3)}%)` }}
        >
          <div className="meeting-room-slide">
            <div className="meeting-room-grid">
              {/* Single tile per participant - unified, no duplicates */}
              {unifiedTiles.map((tile) => {
                const key = tile?.socketId || tile?.member_id || tile?.label;
                const isRemoteScreenShare = tile?.isScreenShare && !tile?.isSelf && !!tile?.stream;
                const isRemoteMember = !tile?.isSelf && !!tile?.stream;
                const handRaisedForTile = tile?.isSelf ? handRaised : handRaisedMap[tile?.socketId];

                return (
                  <div
                    key={key}
                    className="meeting-room-tile"
                    role={isRemoteScreenShare ? "button" : undefined}
                    tabIndex={isRemoteScreenShare ? 0 : undefined}
                    onClick={() => {
                      if (isRemoteScreenShare) {
                        toggleFullscreenForScreenShare(tile);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (isRemoteScreenShare && (e.key === "Enter" || e.key === " ") && e.currentTarget) {
                        e.preventDefault();
                        toggleFullscreenForScreenShare(tile);
                      }
                    }}
                    style={isRemoteScreenShare ? { cursor: "pointer" } : undefined}
                    title={isRemoteScreenShare ? "Click to fullscreen, ESC to exit" : undefined}
                  >
                    <div className="meeting-room-tile-avatar" style={{ overflow: "hidden", position: "relative" }}>
                      {(() => {
                        // Check if stream exists and has video tracks (don't check readyState as it may not be 'live' immediately)
                        // We'll show the video element and let it handle the stream, even if tracks aren't fully ready yet
                        const hasVideoTracks = tile?.stream && tile.stream.getVideoTracks().length > 0;
                        const hasValidStream = hasVideoTracks;

                        if (hasValidStream) {
                          return tile.isSelf ? (
                            <video
                              ref={localVideoRef}
                              autoPlay
                              playsInline
                              muted
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <video
                              key={`video-${tile.socketId}-${tile.stream?.id || 'no-stream'}`}
                              autoPlay
                              playsInline
                              muted={!!localParticipantAudioMuted[tile.socketId]}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              ref={(el) => {
                                if (el) {
                                  remoteVideoRefsMap.current.set(tile.socketId, el);
                                  if (tile.stream) {
                                    if (el.srcObject !== tile.stream) {
                                      el.srcObject = tile.stream;
                                      console.log("📹 Set stream for remote video", tile.socketId);
                                    }
                                    el.muted = !!localParticipantAudioMuted[tile.socketId];
                                    el.volume = localParticipantVolume[tile.socketId] ?? 1;

                                    // Ensure video plays - retry if it fails
                                    const playVideo = async () => {
                                      try {
                                        await el.play();
                                        console.log("✅ Video playing for", tile.socketId);
                                      } catch (err) {
                                        console.warn("⚠️ Video play failed for", tile.socketId, "- retrying...", err);
                                        // Retry after a short delay
                                        setTimeout(() => {
                                          el.play().catch(e => {
                                            console.error("❌ Video play retry failed for", tile.socketId, e);
                                          });
                                        }, 500);
                                      }
                                    };
                                    playVideo();
                                  }
                                } else {
                                  remoteVideoRefsMap.current.delete(tile.socketId);
                                }
                              }}
                              onLoadedMetadata={() => {
                                // Ensure video plays when metadata is loaded
                                const el = remoteVideoRefsMap.current.get(tile.socketId);
                                if (el && tile.stream) {
                                  el.play().catch(err => {
                                    console.warn("⚠️ Video play on metadata load failed:", err);
                                  });
                                }
                              }}
                              onCanPlay={() => {
                                // Ensure video plays when it can play
                                const el = remoteVideoRefsMap.current.get(tile.socketId);
                                if (el && tile.stream) {
                                  el.play().catch(err => {
                                    console.warn("⚠️ Video play on canPlay failed:", err);
                                  });
                                }
                              }}
                            />
                          );
                        }

                        // No valid stream - show photo or initial
                        const photoUrl = tile?.member_photo || tile?.memberPhoto || tile?.user_photo || tile?.photo;
                        if (photoUrl) {
                          return (
                            <>
                              <img
                                src={photoUrl}
                                alt={tile.label}
                                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
                                onError={(e) => {
                                  // If image fails to load, hide it
                                  e.target.style.display = 'none';
                                  // Show initial fallback
                                  const initial = e.target.nextElementSibling;
                                  if (initial) initial.style.display = 'flex';
                                }}
                              />
                              <span
                                className="meeting-room-tile-initial"
                                style={{ display: 'none' }}
                              >
                                {String(tile.label).trim().charAt(0).toUpperCase() || "?"}
                              </span>
                            </>
                          );
                        }
                        return (
                          <span className="meeting-room-tile-initial">
                            {String(tile.label).trim().charAt(0).toUpperCase() || "?"}
                          </span>
                        );
                      })()}
                    </div>
                    {handRaisedForTile && (
                      <div className="meeting-room-hand-overlay" title="Raised hand">
                        <HandWaving size={18} weight="bold" />
                      </div>
                    )}
                    {isRemoteMember && (
                      <button
                        type="button"
                        className="meeting-room-fullscreen-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFullscreenForMember(tile);
                        }}
                        aria-label="Fullscreen"
                        title="Fullscreen"
                      >
                        <ArrowsOut size={16} weight="bold" />
                      </button>
                    )}
                    <span className={`meeting-room-tile-badge ${tile?.isSelf ? "you" : "admin"}`}>
                      {tile?.isSelf ? "You" : tile.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="meeting-room-slide">
            <div className="meeting-room-single">
              {/* Local tile large (no fullscreen on own screen share - it's your screen) */}
              <div className="meeting-room-tile-large">
                <div className="meeting-room-tile-avatar large" style={{ overflow: "hidden" }}>
                  {(!videoMuted || screenSharing) ? (
                    <video
                      ref={localVideoRef2}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : selfPhoto ? (
                    <img
                      src={selfPhoto}
                      alt="Your profile"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        console.warn("❌ Failed to load profile photo:", selfPhoto);
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="meeting-room-tile-initial">
                      {(user?.name || user?.member_name || user?.email || "You")
                        .toString()
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                {/* raised hand indicator for single view */}
                {handRaised && (
                  <div className="meeting-room-hand-overlay" title="Raised hand">
                    <HandWaving size={18} weight="bold" />
                  </div>
                )}
                <span className="meeting-room-tile-badge you">You</span>
              </div>
            </div>
          </div>

          <div className="meeting-room-slide">
            <div className="meeting-room-screen">
              <div className="meeting-room-screen-preview">
                <div className="meeting-room-screen-placeholder" />
              </div>
              <span className="meeting-room-tile-badge admin">Admin screen</span>
            </div>
          </div>
        </div>

        {/* Floating emoji animation - single emoji from bottom to top */}
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            className="floating-emoji"
            style={{
              left: `${item.left}px`,
              top: `${item.top}px`,
            }}
          >
            <div className="floating-emoji-char">{item.emoji}</div>
          </div>
        ))}
      </div>

      {/* Slider dots */}
      <div className="meeting-room-dots">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            className={`meeting-room-dot ${activeSlide === i ? "active" : ""}`}
            onClick={() => setActiveSlide(i)}
            aria-label={`View ${i === 0 ? "members" : i === 1 ? "you" : "screen"}`}
          />
        ))}
      </div>

      {/* Control bar */}
      <div className={`meeting-room-control-bar ${showCommentInput ? 'has-input' : ''}`}>
        <div className="meeting-room-controls">
          <button
            type="button"
            className={`meeting-room-control-btn ${audioMuted ? "" : "active"}`}
            aria-label="Microphone"
            onClick={handleToggleAudio}
            disabled={!meetingId}
            title={!meetingId ? "Missing meeting id" : audioMuted ? "Unmute" : "Mute"}
          >
            {audioMuted ? (
              <MicrophoneSlash size={22} weight="regular" />
            ) : (
              <Microphone size={22} weight="regular" />
            )}
          </button>
          <button
            type="button"
            className={`meeting-room-control-btn ${handRaised ? "active" : ""}`}
            aria-label="Raise hand"
            onClick={handleToggleHand}
            disabled={!meetingId}
          >
            <HandWaving size={22} weight="regular" />
          </button>
          <button
            type="button"
            className={`meeting-room-control-btn ${videoMuted ? "" : "active"}`}
            aria-label="Camera"
            onClick={handleToggleVideo}
            disabled={!meetingId}
            title={!meetingId ? "Missing meeting id" : videoMuted ? "Turn camera on" : "Turn camera off"}
          >
            <VideoCamera size={22} weight="regular" />
          </button>
          <button
            type="button"
            className={`meeting-room-control-btn ${screenSharing ? "active" : ""}`}
            aria-label="Share screen"
            onClick={handleToggleScreenShare}
            disabled={!meetingId}
          >
            <MonitorArrowUp size={22} weight="regular" />
          </button>
          <button
            type="button"
            className="meeting-room-control-btn"
            aria-label="Reactions"
            onClick={() => setShowEmojiPicker((s) => !s)}
            disabled={!meetingId}
            title={!meetingId ? "Missing meeting id" : "Send like"}
          >
            <Smiley size={22} weight="regular" />
          </button>
          <button type="button" className="meeting-room-control-btn" aria-label="Chat" onClick={() => setShowCommentInput(true)}>
            <ChatCircleDots size={22} weight="regular" />
          </button>
          {(() => {
            const remoteIds = unifiedTiles.filter((t) => !t?.isSelf && t?.socketId).map((t) => t.socketId);
            const hasRemote = remoteIds.length > 0;
            const allMuted = hasRemote && remoteIds.every((sid) => !!localParticipantAudioMuted[sid]);
            return (
              <button
                type="button"
                className={`meeting-room-control-btn ${allMuted ? "muted-all" : "active"}`}
                aria-label={allMuted ? "Unmute all participants (for you)" : "Mute all participants (for you)"}
                onClick={handleMuteUnmuteAllParticipants}
                disabled={!meetingId || !hasRemote}
                title={!hasRemote ? "No other participants" : allMuted ? "Unmute all (for you)" : "Mute all (for you)"}
              >
                {allMuted ? (
                  <SpeakerSlash size={22} weight="regular" />
                ) : (
                  <SpeakerHigh size={22} weight="regular" />
                )}
              </button>
            );
          })()}
        </div>
        {showCommentInput && (
          <div className="meeting-room-comment-wrapper">
            <input
              type="text"
              placeholder="Type a Comment..."
              className="meeting-room-comment-input visible"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
              autoFocus
              onBlur={() => {
                // Delay to allow button click
                setTimeout(() => {
                  if (!commentText.trim()) {
                    setShowCommentInput(false);
                  }
                }, 200);
              }}
            />
            <button
              type="button"
              className="meeting-room-comment-send-btn"
              aria-label="Send comment"
              onClick={handleSendComment}
              disabled={!commentText.trim() || !socket || !isConnected || !meetingId}
            >
              <ArrowUp size={18} weight="regular" />
            </button>
          </div>
        )}
        {/* Emoji picker popup */}
        {showEmojiPicker && (
          <div className="meeting-room-emoji-picker" ref={emojiPickerRef}>
            {emojiList.map((e) => (
              <button
                key={e}
                type="button"
                className="emoji-btn"
                onClick={() => selectEmoji(e)}
                aria-label={`React ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reactions display in bottom right - show only 2 most recent, latest at bottom */}
      <div className="meeting-room-reactions-container">
        {(() => {
          // Collect all reactions with their timestamps
          const allReactions = [];
          Object.entries(reactionsMap).forEach(([memberKey, reactionEntry]) => {
            Object.entries(reactionEntry).forEach(([type, data]) => {
              const name = typeof data === 'string' ? data : data.name;
              const timestamp = typeof data === 'string' ? 0 : (data.timestamp || 0);
              allReactions.push({ memberKey, type, name, timestamp });
            });
          });
          // Sort by timestamp (most recent first), take only 2, then reverse so latest is at bottom
          const recentReactions = allReactions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 2)
            .reverse();

          return recentReactions.map((reaction) => (
            <div key={`${reaction.memberKey}-${reaction.type}-${reaction.timestamp}`} className="meeting-room-reaction-item">
              <div className="reaction-icon-small">{getReactionIcon(reaction.type)}</div>
              <div className="reaction-name-text">Emoji by {reaction.name}</div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
};

export default MeetingRoom;