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
} from "@phosphor-icons/react";
import "./MeetingRoom.css";
import api from "../../../API/axiosInstance";
import { smartToast } from "../../../API/toastManager";
import { useSocket } from "../../../context/SocketContext";
import { AuthContext } from "../../../context/AuthContext";
import { useMeetingContext } from "../../../context/MeetingContext";

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
  const [, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream, isScreenShare? }]
  const [handRaisedMap, setHandRaisedMap] = useState({}); // { [socketId]: boolean }
  const [mediaStateMap, setMediaStateMap] = useState({}); // { [socketId]: { audioMuted, videoMuted } }
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { socket, isConnected } = useSocket();
  const { user } = useContext(AuthContext);
  const { participants, setParticipants, setMeetingId, setHasJoined } = useMeetingContext();

  // Persisted media state (no auto-enable: start muted)
  const [audioMuted, setAudioMuted] = useState(() => {
    try {
      const v = sessionStorage.getItem("meetza_audioMuted");
      return v !== null ? v === "true" : true;
    } catch { return true; }
  });
  const [videoMuted, setVideoMuted] = useState(() => {
    try {
      const v = sessionStorage.getItem("meetza_videoMuted");
      return v !== null ? v === "true" : true;
    } catch { return true; }
  });
  const [handRaised, setHandRaised] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const peerMetaRef = useRef(new Map()); // socketId -> { member_id, member_name, member_photo }
  const localStreamRef = useRef(null);
  const cameraVideoTrackRef = useRef(null);
  const meetingIdRef = useRef(null);
  const startedRef = useRef(false);
  const localVideoRef = useRef(null);
  const localVideoRef2 = useRef(null); // separate ref for single view (slide 2)
  const sliderViewportRef = useRef(null);
  const screenTrackRef = useRef(null);
  const makingOffer = useRef(false); // Track if we're currently making an offer
  const polite = useRef(new Map()); // socketId -> boolean (true = polite, false = impolite)
  const iceQueueRef = useRef(new Map()); // socketId -> [candidates]

  const meetingId = useMemo(() => {
    // Prefer navigation state (set when joining), then query string (?meetingId=...)
    return (
      location?.state?.meetingId ||
      searchParams.get("meetingId") ||
      null
    );
  }, [location?.state?.meetingId, searchParams]);

  useEffect(() => {
    meetingIdRef.current = meetingId;
    setMeetingId(meetingId);
  }, [meetingId, setMeetingId]);

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
  }, []);

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
    }
    removeRemoteStream(peerSocketId);
  }, [removeRemoteStream]);

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

    pc.ontrack = (event) => {
      const [stream] = event.streams || [];
      if (stream) {
        const vt = stream.getVideoTracks()[0];
        const isScreenShare = vt && (() => {
          try {
            const s = vt.getSettings?.();
            if (s?.displaySurface === "monitor" || s?.displaySurface === "window" || s?.displaySurface === "browser") return true;
            if ((vt.label || "").toLowerCase().includes("screen")) return true;
          } catch { }
          return false;
        })();
        upsertRemoteStream(peerSocketId, stream, isScreenShare);
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

    return pc;
  }, [socket, upsertRemoteStream]);

  // Add tracks to all existing peer connections when local stream becomes available
  const addTracksToAllPeers = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    for (const [peerSocketId, pc] of peersRef.current.entries()) {
      // Check if tracks are already added
      const senders = pc.getSenders();
      const hasVideo = senders.some(s => s.track && s.track.kind === 'video');
      const hasAudio = senders.some(s => s.track && s.track.kind === 'audio');

      if (!hasVideo || !hasAudio) {
        console.log("🔄 Adding missing tracks to peer", peerSocketId);
        stream.getTracks().forEach((t) => {
          const existing = senders.find(s => s.track && s.track.kind === t.kind);
          if (!existing) {
            pc.addTrack(t, stream);
            console.log("➕ Added track to peer", peerSocketId, { kind: t.kind });
          }
        });

        // Trigger renegotiation if needed
        if (!hasVideo || !hasAudio) {
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer).then(() => {
              const mid = meetingIdRef.current;
              if (socket && mid) {
                socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, () => { });
              }
            }).catch(err => console.error("❌ Error renegotiating after adding tracks:", err));
          }).catch(err => console.error("❌ Error creating offer after adding tracks:", err));
        }
      }
    }
  }, [socket]);

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

      // Ensure local tracks are added
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => {
          const existing = pc.getSenders().find(s => s.track && s.track.kind === t.kind);
          if (!existing) {
            pc.addTrack(t, stream);
          }
        });
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
  }, [socket]);

  /** Get user media only when needed. Does NOT auto-enable - respects audioMuted/videoMuted. */
  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    // Start with empty stream - media activated only when user explicitly enables
    const stream = new MediaStream();
    localStreamRef.current = stream;
    setLocalStream(stream);
    console.log("✅ Created empty local stream (media off by default)");
    return stream;
  }, []);

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
    const hasAudio = stream.getAudioTracks().length > 0;
    const hasCamera = !!getCameraTrack(stream);
    if ((needAudio && !hasAudio) || (needVideo && !hasCamera)) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: needVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
          audio: needAudio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        });
        if (needAudio && !hasAudio) {
          mediaStream.getAudioTracks().forEach((t) => {
            t.enabled = true;
            stream.addTrack(t);
          });
        }
        if (needVideo && !hasCamera) {
          const vt = mediaStream.getVideoTracks()[0];
          if (vt) {
            vt.enabled = true;
            stream.addTrack(vt);
            cameraVideoTrackRef.current = vt;
          }
        }
        setLocalStream(stream);
        setTimeout(() => addTracksToAllPeers(), 100);
      } catch (e) {
        console.error("getUserMedia failed:", e);
        smartToast.error("Could not access camera/microphone.");
        throw e;
      }
    }
    return stream;
  }, [audioMuted, videoMuted, ensureLocalMedia, addTracksToAllPeers, getCameraTrack]);

  const startAndJoinMeetingRtc = useCallback(async () => {
    if (!socket || !isConnected) return;
    const mid = meetingIdRef.current;
    if (!mid) return;
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      await ensureLocalMedia();
    } catch (e) {
      console.error("❌ getUserMedia failed:", e);
      smartToast.error("Could not access camera/microphone.");
      startedRef.current = false;
      return;
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
      socket.emit("updateMediaState", { meetingId: mid, audioMuted, videoMuted });

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
        if (peersRef.current.has(peerSocketId)) {
          console.log("⚠️ Peer connection already exists for", peerSocketId);
          continue;
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

    return () => {
      // cleanup on unmount
      console.log("🧹 Cleaning up RTC on unmount");
      stopMeetingRtc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, socket, isConnected]);

  // Attach stream to both video elements when it changes (incl. when screen share starts)
  useEffect(() => {
    const stream = localStreamRef.current;
    const videoEl1 = localVideoRef.current;
    const videoEl2 = localVideoRef2.current;

    if (stream && videoEl1 && videoEl1.srcObject !== stream) {
      videoEl1.srcObject = stream;
    }

    if (stream && videoEl2 && videoEl2.srcObject !== stream) {
      videoEl2.srcObject = stream;
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
      setParticipants((prev) => {
        if (prev.some((p) => (p?.socketId || p?.id) === peerSocketId)) return prev;
        return [...prev, entry];
      });

      const meta = { member_id: entry.member_id, member_name: entry.member_name, member_photo: entry.member_photo, member_email: entry.member_email };
      peerMetaRef.current.set(peerSocketId, meta);

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
      setHandRaisedMap((m) => { const n = { ...m }; delete n[peerSocketId]; return n; });
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
      setHandRaisedMap((m) => ({ ...m, [sid]: raised }));
    };
    const onMediaStateUpdated = (data) => {
      const sid = data?.socketId || data?.id;
      const mid = data?.meetingId;
      if (!sid || !mid || mid !== meetingIdRef.current) return;
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
        const meta = fromSocketId ? peerMetaRef.current.get(fromSocketId) : null;
        const fromName = data?.name ?? data?.member_name ?? meta?.member_name ?? "Someone";
        const key = String(fromMemberId || fromSocketId || fromName);
        addReactionToMap(key, type, fromName);
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
  }, [closePeer, createPeerConnection, socket, createAndSendOffer]);

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
  const [reactionsMap, setReactionsMap] = useState({}); // { memberKey: { like: [names], ... } }
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
      const showVideo = stream && (isSelf ? (!videoMuted || isScreenShare) : true);
      return {
        ...p,
        isSelf,
        stream: showVideo ? stream : null,
        isScreenShare,
        label: p?.member_name || p?.member_email || "Participant",
      };
    });
  }, [participants, remoteStreams, socket?.id, selfMemberId, videoMuted, screenSharing]);

  const screenShareFullscreenRef = useRef(null);

  const toggleFullscreenForScreenShare = useCallback((tile) => {
    if (!tile?.isScreenShare || tile?.isSelf || !tile?.stream) return;
    const el = screenShareFullscreenRef.current;
    if (!el) return;
    const video = el.querySelector("video");
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    el.style.visibility = "visible";
    el.style.pointerEvents = "auto";
    video.srcObject = tile.stream;
    video.play?.().then(() => {
      el.requestFullscreen?.().then(() => {}).catch(() => {});
    }).catch(() => {
      el.requestFullscreen?.().then(() => {}).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && screenShareFullscreenRef.current) {
        const el = screenShareFullscreenRef.current;
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
        const v = el.querySelector("video");
        if (v) v.srcObject = null;
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

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
        if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = true));
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

  const handleToggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
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
    // spawn floating emojis across the meeting viewport
    spawnFloatingEmojis(emoji, user?.name || user?.member_name || user?.email || "You", 7);
    setShowEmojiPicker(false);
  };

  const spawnFloatingEmojis = (emoji, name, count = 6) => {
    const container = sliderViewportRef.current;
    const rect = container ? container.getBoundingClientRect() : null;
    const items = [];
    for (let i = 0; i < count; i++) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      // random positions inside container
      const left = rect ? Math.max(8, Math.random() * (rect.width - 48)) : Math.random() * 400;
      const top = rect ? Math.max(8, Math.random() * (rect.height - 48)) : Math.random() * 140;
      items.push({ id, emoji, name, left, top });
    }
    setFloatingEmojis((prev) => [...prev, ...items]);
    // remove them after 3.2s
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((f) => !items.find((it) => it.id === f.id)));
    }, 3200);
  };

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

  const addReactionToMap = (memberKey, type, name) => {
    setReactionsMap((prev) => {
      const next = { ...prev };
      const entry = next[memberKey] ? { ...next[memberKey] } : {};
      const list = Array.isArray(entry[type]) ? [...entry[type]] : [];
      if (!list.includes(name)) list.push(name);
      entry[type] = list;
      next[memberKey] = entry;
      return next;
    });
  };


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
          <p className="meeting-room-subtitle">Group Meeting name</p>
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
        <video autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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
                const handRaisedForTile = tile?.isSelf ? handRaised : handRaisedMap[tile?.socketId];
                const memberKey = tile?.member_id || tile?.socketId || tile?.member_email || tile?.label;
                const reactionEntry = reactionsMap[memberKey];

                return (
                  <div
                    key={key}
                    className="meeting-room-tile"
                    role={isRemoteScreenShare ? "button" : undefined}
                    tabIndex={isRemoteScreenShare ? 0 : undefined}
                    onClick={() => isRemoteScreenShare && toggleFullscreenForScreenShare(tile)}
                    onKeyDown={(e) => {
                      if (isRemoteScreenShare && (e.key === "Enter" || e.key === " ") && e.currentTarget) {
                        e.preventDefault();
                        toggleFullscreenForScreenShare(tile);
                      }
                    }}
                    style={isRemoteScreenShare ? { cursor: "pointer" } : undefined}
                    title={isRemoteScreenShare ? "Click to fullscreen, ESC to exit" : undefined}
                  >
                    <div className="meeting-room-tile-avatar" style={{ overflow: "hidden" }}>
                      {tile?.stream ? (
                        tile.isSelf ? (
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <video
                            autoPlay
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            ref={(el) => {
                              if (el && tile.stream && el.srcObject !== tile.stream) {
                                el.srcObject = tile.stream;
                                el.play?.().catch(() => {});
                              }
                            }}
                          />
                        )
                      ) : tile?.member_photo ? (
                        <img
                          src={tile.member_photo}
                          alt={tile.label}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span className="meeting-room-tile-initial">
                          {String(tile.label).trim().charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    {handRaisedForTile && (
                      <div className="meeting-room-hand-overlay" title="Raised hand">
                        <HandWaving size={18} weight="bold" />
                      </div>
                    )}
                    {reactionEntry && Object.entries(reactionEntry).map(([type, names]) => (
                      <div key={type} className="meeting-room-reaction" title={type}>
                        <div className="reaction-icon">{getReactionIcon(type)}</div>
                        <div className="reaction-names">
                          {names.map((n) => <div key={n} className="reaction-name">{n}</div>)}
                        </div>
                      </div>
                    ))}
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

        {/* floating emojis rendered over the viewport */}
        {floatingEmojis.map((f) => (
          <div
            key={f.id}
            className="floating-emoji"
            style={{ left: f.left, top: f.top }}
            title={`Emoji by ${f.name}`}
          >
            <div className="floating-emoji-char">{f.emoji}</div>
            <div className="floating-emoji-by">Emoji by {f.name}</div>
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
        </div>
        {showCommentInput && (
          <div className="meeting-room-comment-wrapper">
            <input
              type="text"
              placeholder="Type a Comment..."
              className="meeting-room-comment-input visible"
              autoFocus
              onBlur={() => setShowCommentInput(false)}
            />
            <button
              type="button"
              className="meeting-room-comment-send-btn"
              aria-label="Send comment"
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
    </div>
  );
};

export default MeetingRoom;