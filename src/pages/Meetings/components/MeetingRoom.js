import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const MeetingRoom = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream }]
  const [audioMuted, setAudioMuted] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [handRaisedMap, setHandRaisedMap] = useState({}); // { memberKey: true } for remote participants
  const [screenSharing, setScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]); // from REST: [{member_id, member_name, member_photo, ...}]
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [fullscreenOverlay, setFullscreenOverlay] = useState(null); // { stream, label }
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { socket, isConnected } = useSocket();
  const { user } = useContext(AuthContext);

  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const peerMetaRef = useRef(new Map()); // socketId -> { member_id, member_name, member_photo }
  const localStreamRef = useRef(null);
  const cameraVideoTrackRef = useRef(null);
  const meetingIdRef = useRef(null);
  const startedRef = useRef(false);
  const selfMemberIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const localVideoRef2 = useRef(null); // separate ref for single view (slide 2)
  const sliderViewportRef = useRef(null);
  const screenTrackRef = useRef(null);
  const makingOffer = useRef(false); // Track if we're currently making an offer
  const polite = useRef(new Map()); // socketId -> boolean (true = polite, false = impolite)
  const iceQueueRef = useRef(new Map()); // socketId -> [candidates]
  const addTracksToAllPeersRef = useRef(() => {});
  const fullscreenVideoRef = useRef(null);

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
  }, [meetingId]);

  // Always start with mic and camera OFF for everyone (join or refresh)
  useEffect(() => {
    setAudioMuted(true);
    setVideoMuted(true);
  }, []);

  const upsertRemoteStream = useCallback((socketId, stream) => {
    if (!socketId || !stream) return;
    console.log("🔄 Upserting remote stream:", socketId, {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
      audioTrackEnabled: stream.getAudioTracks()[0]?.enabled,
    });
    setRemoteStreams((prev) => {
      const idx = prev.findIndex((x) => x.socketId === socketId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { socketId, stream };
        console.log("✅ Updated existing remote stream for", socketId);
        return next;
      }
      console.log("✅ Added new remote stream for", socketId);
      return [...prev, { socketId, stream }];
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
        console.log("🎬 onTrack event received from", peerSocketId, {
          trackKind: event.track.kind,
          trackId: event.track.id,
          streamId: stream.id,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          trackEnabled: event.track.enabled,
        });
        upsertRemoteStream(peerSocketId, stream);
        stream.getVideoTracks().forEach((t) => {
          const onTrackChange = () => setRemoteStreams((prev) => [...prev]);
          t.addEventListener("ended", onTrackChange);
          t.addEventListener("mute", onTrackChange);
          t.addEventListener("unmute", onTrackChange);
        });
      } else {
        console.warn("⚠️ onTrack event but no stream found for", peerSocketId);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        addTracksToAllPeersRef.current?.();
      }
    };

    // Add local tracks if stream is available
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => {
        console.log("➕ Adding local track to peer", peerSocketId, { kind: t.kind, enabled: t.enabled });
        pc.addTrack(t, stream);
      });
    } else {
      console.warn("⚠️ Local stream not ready when creating peer connection for", peerSocketId);
    }

    return pc;
  }, [socket, upsertRemoteStream]);

  // Add tracks to all existing peer connections and renegotiate so others see the new tracks
  const addTracksToAllPeers = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const peers = Array.from(peersRef.current.entries());
    for (let i = 0; i < peers.length; i++) {
      const [peerSocketId, pc] = peers[i];
      if (i > 0) await new Promise((r) => setTimeout(r, 120));

      const senders = pc.getSenders();
      const hasVideo = senders.some((s) => s.track && s.track.kind === "video");
      const hasAudio = senders.some((s) => s.track && s.track.kind === "audio");
      const streamHasVideo = stream.getVideoTracks().length > 0;
      const streamHasAudio = stream.getAudioTracks().length > 0;

      const needVideo = streamHasVideo && !hasVideo;
      const needAudio = streamHasAudio && !hasAudio;

      if (needVideo || needAudio) {
        console.log("🔄 Adding missing tracks to peer", peerSocketId, { needVideo, needAudio });
        stream.getTracks().forEach((t) => {
          const existing = senders.find((s) => s.track && s.track.kind === t.kind);
          if (!existing) {
            pc.addTrack(t, stream);
            console.log("➕ Added track to peer", peerSocketId, { kind: t.kind });
          }
        });

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const mid = meetingIdRef.current;
          if (socket && mid) {
            socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, (ack) => {
              if (ack && !ack.ok) console.warn("⚠️ Renegotiation offer failed:", ack);
              else console.log("✅ Renegotiation offer sent to", peerSocketId);
            });
          }
        } catch (err) {
          console.error("❌ Error renegotiating after adding tracks:", err);
        }
      }
    }
  }, [socket]);
  addTracksToAllPeersRef.current = addTracksToAllPeers;

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

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    // No getUserMedia on join - mic and camera stay OFF until user clicks to enable
    console.log("🎥 Starting with empty stream - mic/camera off until you enable them");
    const stream = new MediaStream();
    localStreamRef.current = stream;
    setLocalStream(stream);
    cameraVideoTrackRef.current = null;
    return stream;
  }, []);

  const startAndJoinMeetingRtc = useCallback(async () => {
    if (!socket || !isConnected) return;
    const mid = meetingIdRef.current;
    if (!mid) return;
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      await ensureLocalMedia();
    } catch (e) {
      console.error("❌ Failed to init local stream:", e);
      smartToast.error("Could not initialize meeting.");
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

      // Force mic and camera OFF on join - only turn on when user clicks
      setAudioMuted(true);
      setVideoMuted(true);
      socket.emit("updateMediaState", { meetingId: mid, audioMuted: true, videoMuted: true });

      // Persist active meeting so that other parts of the app (e.g. logout handler, floating tile)
      // can perform a proper leave if the user logs out while in a meeting.
      try {
        sessionStorage.setItem("activeMeetingId", String(mid));
        const groupId = location?.state?.groupId;
        if (groupId) sessionStorage.setItem("activeMeetingGroupId", String(groupId));
      } catch (e) {
        console.warn("Could not persist activeMeetingId to sessionStorage:", e);
      }

      const participants = Array.isArray(ack?.participants) ? ack.participants : [];
      console.log("👥 Found existing participants:", participants.length, "Full ack:", ack);

      // Add existing participants to state so we have their tiles (for hand raise, reactions, etc.)
      if (participants.length > 0) {
        setParticipants((prev) => {
          const next = [...prev];
          for (const p of participants) {
            const userId = p?.userId || p?.member_id || p?.memberId || p?.user_id;
            if (!userId) continue;
            const exists = next.some((x) => String(x?.member_id) === String(userId));
            if (exists) continue;
            next.push({
              member_id: userId,
              member_name: p?.name || p?.member_name || p?.memberName,
              member_email: p?.email || p?.member_email,
              member_photo: p?.user_photo || p?.member_photo || p?.memberPhoto,
            });
          }
          return next;
        });
      }

      // If backend doesn't send participants in ack, try to get them from REST API
      if (participants.length === 0) {
        console.log("⚠️ No participants in ack, will check REST API for current participants");
        setTimeout(async () => {
          try {
            const res = await api.get(`/meeting/${mid}/participants`);
            const root = res?.data;
            const effective = root?.data && root?.success === undefined ? root.data : root;
            const payload = effective?.data ?? effective;
            const list = Array.isArray(payload) ? payload : [];
            console.log("👥 REST API participants:", list.length);
            // Note: REST API gives member_id, but we need socketId to create peer connections
            // So we can't directly use this, but it confirms other people are in the meeting
          } catch (e) {
            console.warn("Could not fetch participants from REST:", e);
          }
        }, 1000);
      }

      // Ensure local stream is ready before creating peer connections
      const stream = localStreamRef.current;
      if (!stream) {
        console.warn("⚠️ Local stream not ready, waiting...");
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      for (const p of participants) {
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
  }, [closePeer, socket]);

  // Ensure mic and camera stay OFF when entering meeting (reset on mount/meetingId)
  useEffect(() => {
    if (meetingId) {
      setAudioMuted(true);
      setVideoMuted(true);
    }
  }, [meetingId]);

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

  // Periodically re-sync tracks to peers (fixes camera/mic/screen after someone refreshes)
  useEffect(() => {
    if (!meetingId || !socket) return;
    const syncTracks = () => {
      const stream = localStreamRef.current;
      if (!stream) return;
      if (peersRef.current.size === 0) return;
      addTracksToAllPeers();
    };
    const interval = setInterval(syncTracks, 1500);
    return () => clearInterval(interval);
  }, [meetingId, socket, addTracksToAllPeers]);

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

  // Handle video/audio track enabled state (when screen sharing, keep video track enabled - it's the screen)
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = screenSharing ? true : !videoMuted;
    });
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !audioMuted;
    });
  }, [videoMuted, audioMuted, screenSharing]);

  // Fetch meeting participants (names/photos) via REST for in-room display
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!meetingId) return;
      setLoadingParticipants(true);
      try {
        const res = await api.get(`/meeting/${meetingId}/participants`);
        const root = res?.data;
        const effective = root?.data && root?.success === undefined ? root.data : root;
        const payload = effective?.data ?? effective;
        const list = Array.isArray(payload) ? payload : [];
        setParticipants(list);
      } catch (e) {
        console.warn("⚠️ Failed to fetch meeting participants:", e);
        setParticipants([]);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [meetingId]);

  // Socket listeners (signaling)
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
      console.log("✅ Processing participantJoined for", peerSocketId);

      // store metadata if provided
      const meta = {
        member_id: data?.member_id || data?.memberId || data?.userId || data?.user_id,
        member_name: data?.member_name || data?.memberName || data?.name,
        member_photo: data?.member_photo || data?.memberPhoto || data?.photo,
        member_email: data?.member_email || data?.email,
      };
      if (meta.member_id || meta.member_name || meta.member_photo || meta.member_email) {
        peerMetaRef.current.set(peerSocketId, meta);
      }

      // Add to participants list so they appear in meeting room without refresh
      const userId = meta.member_id || data?.userId || data?.user_id;
      if (userId) {
        setParticipants((prev) => {
          const exists = prev.some((p) => String(p.member_id) === String(userId));
          if (exists) return prev;
          return [
            ...prev,
            {
              member_id: userId,
              member_name: meta.member_name || data?.name,
              member_email: meta.member_email || data?.email,
              member_photo: meta.member_photo || data?.user_photo,
            },
          ];
        });
      }

      console.log("🔗 Creating peer connection for new participant", peerSocketId);
      const pc = createPeerConnection(peerSocketId);
      peersRef.current.set(peerSocketId, pc);

      // Determine polite/impolite based on socket.id comparison
      // The peer with smaller socket.id is impolite (initiates offer)
      if (socket.id < peerSocketId) {
        polite.current.set(peerSocketId, false); // We are impolite
        console.log("🔵 We are impolite for new participant", peerSocketId, "(our id is smaller)");
        await createAndSendOffer(peerSocketId);
      } else {
        polite.current.set(peerSocketId, true); // We are polite
        console.log("🟢 We are polite for new participant", peerSocketId, "(their id is smaller)");
        // We wait for their offer
      }
      // Re-sync tracks multiple times (participant may have just refreshed - connection takes time)
      [400, 1000, 2200, 4000, 7000, 11000].forEach((ms) => setTimeout(() => addTracksToAllPeers(), ms));
    };

    const onParticipantLeft = (data) => {
      const peerSocketId = data?.socketId || data?.id || data?.fromSocketId;
      const userId = data?.userId || data?.user_id || data?.member_id;
      const mid = data?.meetingId;
      if (!peerSocketId || !mid) return;
      if (mid !== meetingIdRef.current) return;

      const meta = peerMetaRef.current.get(peerSocketId);
      const memberId = userId || meta?.member_id;

      removeRemoteStream(peerSocketId);
      peerMetaRef.current.delete(peerSocketId);
      setParticipants((prev) =>
        memberId ? prev.filter((p) => String(p.member_id) !== String(memberId)) : prev
      );
      setHandRaisedMap((prev) => {
        const next = { ...prev };
        delete next[String(peerSocketId)];
        if (memberId) delete next[String(memberId)];
        return next;
      });
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

    // Unified event names: participantJoined, participantLeft, participantsList
    socket.on("participantJoined", onParticipantJoined);
    socket.on("participantLeft", onParticipantLeft);
    socket.on("requestMedia", (data) => {
      const mid = data?.meetingId;
      if (mid && mid === meetingIdRef.current) {
        [0, 300, 800, 1800].forEach((ms) => setTimeout(() => addTracksToAllPeersRef.current?.(), ms));
      }
    });
    socket.on("participantsList", async (participants) => {
      console.log("📋 Received participantsList event:", participants);
      if (!Array.isArray(participants)) return;

      setParticipants((prev) => {
        const next = [...prev];
        for (const p of participants) {
          const userId = p?.userId || p?.member_id || p?.memberId;
          if (!userId) continue;
          const exists = next.some((x) => String(x?.member_id) === String(userId));
          if (exists) continue;
          next.push({
            member_id: userId,
            member_name: p?.member_name || p?.name || p?.memberName,
            member_email: p?.member_email || p?.email,
            member_photo: p?.member_photo || p?.user_photo || p?.photo,
          });
        }
        return next;
      });

      const stream = localStreamRef.current;
      if (!stream) {
        console.warn("⚠️ Local stream not ready for participantsList");
        return;
      }

      for (const p of participants) {
        const peerSocketId = p?.socketId || p?.id || p;
        if (!peerSocketId || peerSocketId === socket.id) continue;
        if (peersRef.current.has(peerSocketId)) continue;

        // Store metadata if provided
        const meta = {
          member_id: p?.member_id || p?.memberId || p?.userId || p?.user_id,
          member_name: p?.member_name || p?.memberName || p?.name,
          member_email: p?.member_email || p?.email,
          member_photo: p?.member_photo || p?.memberPhoto || p?.photo,
        };
        if (meta.member_id || meta.member_name || meta.member_photo || meta.member_email) {
          peerMetaRef.current.set(peerSocketId, meta);
        }

        console.log("🔗 Creating peer connection from participantsList for", peerSocketId);
        const pc = createPeerConnection(peerSocketId);
        peersRef.current.set(peerSocketId, pc);

        // Determine polite/impolite based on socket.id comparison
        if (socket.id < peerSocketId) {
          polite.current.set(peerSocketId, false); // We are impolite
          console.log("🔵 We are impolite for", peerSocketId, "(our id is smaller)");
          await createAndSendOffer(peerSocketId);
        } else {
          polite.current.set(peerSocketId, true); // We are polite
          console.log("🟢 We are polite for", peerSocketId, "(their id is smaller)");
        }
      }
    });

    socket.on("webrtcOffer", onWebrtcOffer);
    socket.on("webrtcAnswer", onWebrtcAnswer);
    socket.on("webrtcIceCandidate", onIceCandidate);
    const onReaction = (data) => {
      try {
        const mid = data?.meetingId;
        if (!mid || mid !== meetingIdRef.current) return;
        const fromMemberId = data?.member_id || data?.memberId || data?.userId || null;
        const fromSocketId = data?.fromSocketId || data?.from || data?.socketId || null;
        if (fromMemberId && String(fromMemberId) === String(selfMemberIdRef.current)) return;
        if (fromSocketId && fromSocketId === socket.id) return;
        const type = data?.type || data?.reaction || "like";
        const fromName = data?.member_name || data?.memberName || data?.name || (fromSocketId ? getPeerLabel(fromSocketId) : null) || "Someone";
        const keysToAdd = [fromMemberId && String(fromMemberId), fromSocketId && String(fromSocketId), fromName && fromName !== "Someone" ? fromName : null].filter(Boolean);
        if (keysToAdd.length === 0) return;
        setReactionsMap((prev) => {
          const next = { ...prev };
          for (const k of keysToAdd) {
            const entry = next[k] ? { ...next[k] } : {};
            const list = Array.isArray(entry[type]) ? [...entry[type]] : [];
            if (!list.includes(fromName)) list.push(fromName);
            entry[type] = list;
            next[k] = entry;
          }
          return next;
        });
      } catch (e) {
        console.error("❌ Error handling reaction event:", e, data);
      }
    };
    socket.on("reaction", onReaction);
    // Also listen for alternative event names in case backend uses different naming
    socket.on("meetingReaction", onReaction);
    socket.on("reactionReceived", onReaction);

    const onHandRaised = (data) => {
      const mid = data?.meetingId;
      if (!mid || mid !== meetingIdRef.current) return;
      const userId = data?.userId || data?.member_id || data?.memberId;
      const socketId = data?.socketId || data?.fromSocketId;
      if (userId && String(userId) === String(selfMemberIdRef.current)) return;
      if (socketId && socketId === socket.id) return;
      const raised = data?.raised !== false;
      const peerLabel = socketId ? getPeerLabel(socketId) : null;
      const keysToUpdate = [userId && String(userId), socketId && String(socketId), peerLabel && peerLabel !== "Someone" ? peerLabel : null].filter(Boolean);
      if (keysToUpdate.length === 0) return;
      setHandRaisedMap((prev) => {
        const next = raised ? { ...prev } : { ...prev };
        for (const k of keysToUpdate) {
          if (raised) next[k] = true;
          else delete next[k];
        }
        return next;
      });
    };
    socket.on("handRaised", onHandRaised);

    return () => {
      console.log("🧹 Removing socket listeners");
      socket.off("participantJoined", onParticipantJoined);
      socket.off("participantLeft", onParticipantLeft);
      socket.off("requestMedia");
      socket.off("participantsList");
      socket.off("webrtcOffer", onWebrtcOffer);
      socket.off("webrtcAnswer", onWebrtcAnswer);
      socket.off("webrtcIceCandidate", onIceCandidate);
      socket.off("reaction", onReaction);
      socket.off("meetingReaction", onReaction);
      socket.off("reactionReceived", onReaction);
      socket.off("handRaised", onHandRaised);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePeer, createPeerConnection, socket, createAndSendOffer, removeRemoteStream]);

  const getPeerLabel = useCallback((socketId) => {
    const meta = peerMetaRef.current.get(socketId);
    return meta?.member_name || meta?.member_id || socketId;
  }, []);

  const selfMemberId = useMemo(() => user?.id || user?.member_id || null, [user?.id, user?.member_id]);
  selfMemberIdRef.current = selfMemberId;
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
    // If type already is an emoji character, show it
    try {
      if (typeof type === "string" && /[\p{Emoji}]/u.test(type)) return type;
    } catch (e) {
      // older engines may not support \p{Emoji}
      if (typeof type === "string" && /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(type)) return type;
    }
    if (type === "like") return "👍";
    if (type === "heart") return "❤️";
    return type;
  };

  const displayParticipants = useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    return list.filter((p) => {
      if (!p) return false;
      if (selfMemberId && p.member_id && String(p.member_id) === String(selfMemberId)) return false;
      if (selfEmail && p.member_email && String(p.member_email).toLowerCase() === String(selfEmail).toLowerCase()) return false;
      return true;
    });
  }, [participants, selfEmail, selfMemberId]);

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

  // Unified tiles: exactly one per person. Stream-first: camera/screen or photo. No duplicates.
  const unifiedParticipantTiles = useMemo(() => {
    const tiles = [];
    const seenMemberIds = new Set();
    const seenSocketIds = new Set();

    for (const { socketId, stream } of remoteStreams) {
      if (seenSocketIds.has(socketId)) continue;
      seenSocketIds.add(socketId);
      const meta = peerMetaRef.current.get(socketId);
      const memberId = meta?.member_id;
      const p = displayParticipants.find((x) => memberId && String(x?.member_id) === String(memberId));
      const key = memberId ? String(memberId) : socketId;
      if (seenMemberIds.has(key)) continue;
      seenMemberIds.add(key);
      tiles.push({
        key: `tile-${key}`,
        label: p?.member_name || meta?.member_name || meta?.member_id || getPeerLabel(socketId),
        member_photo: p?.member_photo || meta?.member_photo,
        member_id: memberId,
        member_email: p?.member_email || meta?.member_email,
        stream,
        socketId,
      });
    }

    for (const p of displayParticipants) {
      const memberId = p?.member_id ?? p?.id;
      const key = memberId ? String(memberId) : p?.member_email || `p-${Math.random()}`;
      if (seenMemberIds.has(String(key))) continue;
      const stream = getParticipantStream(p);
      if (stream) continue;
      seenMemberIds.add(String(key));
      tiles.push({
        key: `tile-${key}`,
        label: p?.member_name || "Member",
        member_photo: p?.member_photo,
        member_id: memberId,
        member_email: p?.member_email,
        stream: null,
        socketId: null,
      });
    }
    return tiles;
  }, [displayParticipants, remoteStreams, getParticipantStream, getPeerLabel]);

  // Get all possible keys for a tile (for reaction/handRaised lookup) - maximizes match chance
  const getTileLookupKeys = useCallback((tile) => {
    const keys = new Set();
    const add = (v) => v != null && v !== "" && keys.add(String(v));
    add(tile?.member_id);
    add(tile?.member_email);
    add(tile?.socketId);
    add(tile?.label);
    const memberId = tile?.member_id;
    if (memberId) {
      for (const [sid, meta] of peerMetaRef.current.entries()) {
        if (meta?.member_id && String(meta.member_id) === String(memberId)) add(sid);
      }
    }
    return Array.from(keys);
  }, []);

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
    const stream = localStreamRef.current;
    const audioTracks = stream?.getAudioTracks?.() || [];
    const mid = meetingIdRef.current;

    if (!audioMuted) {
      setAudioMuted(true);
      audioTracks.forEach((t) => (t.enabled = false));
      for (const pc of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
        if (sender) sender.replaceTrack(null).catch(() => {});
      }
      if (socket && mid) socket.emit("updateMediaState", { meetingId: mid, audioMuted: true, videoMuted });
      return;
    }

    if (audioTracks.length === 0) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack && stream) {
          stream.addTrack(audioTrack);
          await addTracksToAllPeers();
          [500, 1200].forEach((ms) => setTimeout(() => addTracksToAllPeers(), ms));
        }
      } catch (err) {
        console.error("❌ Could not get microphone:", err);
        smartToast.error("Could not access microphone.");
        return;
      }
    }

    setAudioMuted(false);
    const audioTrack = localStreamRef.current?.getAudioTracks?.()?.[0];
    localStreamRef.current?.getAudioTracks?.().forEach((t) => (t.enabled = true));
    for (const pc of peersRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
      if (sender && audioTrack) sender.replaceTrack(audioTrack).catch(() => {});
    }
    addTracksToAllPeers();
    setTimeout(() => addTracksToAllPeers(), 800);
    if (socket && mid) socket.emit("updateMediaState", { meetingId: mid, audioMuted: false, videoMuted });
  };

  const handleToggleVideo = async () => {
    const stream = localStreamRef.current;
    const videoTracks = stream?.getVideoTracks?.() || [];
    const mid = meetingIdRef.current;

    if (!videoMuted) {
      setVideoMuted(true);
      videoTracks.forEach((t) => (t.enabled = false));
      if (!screenSharing) {
        for (const pc of peersRef.current.values()) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(null).catch(() => {});
        }
      }
      if (socket && mid) socket.emit("updateMediaState", { meetingId: mid, audioMuted, videoMuted: true });
      return;
    }

    if (videoTracks.length === 0) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (videoTrack && stream) {
          stream.addTrack(videoTrack);
          cameraVideoTrackRef.current = videoTrack;
          setVideoMuted(false);
          await addTracksToAllPeers();
          [500, 1200].forEach((ms) => setTimeout(() => addTracksToAllPeers(), ms));
          setTimeout(() => {
            const s = localStreamRef.current;
            if (localVideoRef.current && s) {
              localVideoRef.current.srcObject = s;
              localVideoRef.current.play?.().catch(() => {});
            }
            if (localVideoRef2.current && s) {
              localVideoRef2.current.srcObject = s;
              localVideoRef2.current.play?.().catch(() => {});
            }
          }, 0);
          return;
        }
      } catch (err) {
        console.error("❌ Could not get camera:", err);
        smartToast.error("Could not access camera.");
        return;
      }
    }

    setVideoMuted(false);
    localStreamRef.current?.getVideoTracks?.().forEach((t) => (t.enabled = true));
    if (!screenSharing) {
      const camTrack = cameraVideoTrackRef.current || localStreamRef.current?.getVideoTracks?.()?.[0];
      for (const pc of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender && camTrack) sender.replaceTrack(camTrack).catch(() => {});
      }
      addTracksToAllPeers();
      setTimeout(() => addTracksToAllPeers(), 800);
    }
    if (socket && mid) socket.emit("updateMediaState", { meetingId: mid, audioMuted, videoMuted: false });
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
      if (req) {
        const p = req.call(el);
        if (p && typeof p.catch === "function") p.catch((err) => console.warn("Fullscreen failed:", err));
      }
    }
  };

  useEffect(() => {
    if (!fullscreenOverlay) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e) => {
      if (e.key === "Escape") setFullscreenOverlay(null);
    };
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreenOverlay]);

  // Set fullscreen video srcObject and play - ensure screen share displays (no black screen)
  useEffect(() => {
    if (!fullscreenOverlay?.stream) return;
    const el = fullscreenVideoRef.current;
    if (!el) return;
    const stream = fullscreenOverlay.stream;
    stream.getVideoTracks().forEach((t) => { t.enabled = true; });
    el.srcObject = stream;
    const play = () => el.play?.().catch(() => {});
    play();
    [100, 300, 500].forEach((ms) => setTimeout(play, ms));
    return () => {};
  }, [fullscreenOverlay]);

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

  // Stream has visible video (enabled live track) - avoid black screen, show photo when video off/ended
  const hasVisibleVideo = (stream) => {
    if (!stream) return false;
    return stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
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
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()?.[0];
        if (!screenTrack) return;

        screenTrackRef.current = screenTrack;
        setScreenSharing(true);

        const streamForScreen = new MediaStream([...stream.getAudioTracks(), screenTrack]);
        const mid = meetingIdRef.current;

        const peerEntries = Array.from(peersRef.current.entries());
        for (let i = 0; i < peerEntries.length; i++) {
          if (i > 0) await new Promise((r) => setTimeout(r, 120));
          const [peerSocketId, pc] = peerEntries[i];
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) {
            try {
              await sender.replaceTrack(screenTrack);
            } catch (err) {
              console.error("❌ Failed to replace track for", peerSocketId, ":", err);
            }
          } else {
            pc.addTrack(screenTrack, streamForScreen);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("webrtcOffer", { toSocketId: peerSocketId, meetingId: mid, sdp: offer }, (ack) => {
                if (ack && !ack.ok) console.error("❌ Screen share renegotiation failed:", ack);
              });
            } catch (err) {
              console.error("❌ Renegotiation for screen share failed:", err);
            }
          }
        }

        const newStream = new MediaStream([...stream.getAudioTracks(), screenTrack]);
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
          localVideoRef.current.play?.().catch(() => {});
        }
        if (localVideoRef2.current) {
          localVideoRef2.current.srcObject = newStream;
          localVideoRef2.current.play?.().catch(() => {});
        }
        setTimeout(() => addTracksToAllPeers(), 500);

        screenTrack.onended = async () => {
          try {
            const cameraTrack = cameraVideoTrackRef.current;
            for (const pc of peersRef.current.values()) {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (sender) await sender.replaceTrack(cameraTrack || null);
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
      }
    } else {
      const screenTrack = screenTrackRef.current;
      if (screenTrack) {
        screenTrack.stop();
        screenTrackRef.current = null;
      }
      const cameraTrack = cameraVideoTrackRef.current;
      const peerList = Array.from(peersRef.current.values());
      for (let i = 0; i < peerList.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 80));
        const pc = peerList[i];
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) await sender.replaceTrack(cameraTrack || null).catch(() => {});
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

      <div className="meeting-room-slider-viewport" ref={sliderViewportRef}>
        <div
          className={`meeting-room-slider-track ${activeSlide === 1 ? 'single-view' : ''}`}
          style={{ transform: `translateX(-${activeSlide * (100 / 3)}%)` }}
        >
          <div className="meeting-room-slide">
            <div className="meeting-room-grid">
              {/* Local tile (no fullscreen on own screen share - it's your screen) */}
              <div className="meeting-room-tile">
                <div className="meeting-room-tile-avatar" style={{ overflow: "hidden" }}>
                  {(!videoMuted || screenSharing) ? (
                    <video
                      ref={localVideoRef}
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
                {/* raised hand indicator for current user (local) */}
                {handRaised && (
                  <div className="meeting-room-hand-overlay" title="Raised hand">
                    <HandWaving size={18} weight="bold" />
                  </div>
                )}
                <span className="meeting-room-tile-badge you">You</span>
              </div>

              {/* Unified participant tiles: one per person, shows stream (screen/camera) or photo or initial */}
              {loadingParticipants ? (
                <div className="meeting-room-tile">
                  <div className="meeting-room-tile-avatar">
                    <span className="meeting-room-tile-initial">...</span>
                  </div>
                </div>
              ) : unifiedParticipantTiles.map((tile) => {
                const { key, label, member_photo, member_id, member_email, stream } = tile;
                const showVideo = stream && hasVisibleVideo(stream);
                const isRemoteScreenShare = showVideo && isScreenShareStream(stream);
                const canFullscreen = showVideo;
                const memberKey = member_id || member_email || tile.socketId || label;
                const lookupKeys = getTileLookupKeys(tile);
                return (
                  <div
                    key={key}
                    className="meeting-room-tile"
                    role={canFullscreen ? "button" : undefined}
                    tabIndex={canFullscreen ? 0 : undefined}
                    onClick={(e) => {
                      if (canFullscreen && stream) {
                        e.preventDefault();
                        e.stopPropagation();
                        setFullscreenOverlay({ stream, label });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (canFullscreen && (e.key === "Enter" || e.key === " ") && stream) {
                        e.preventDefault();
                        setFullscreenOverlay({ stream, label });
                      }
                    }}
                    style={canFullscreen ? { cursor: "pointer" } : undefined}
                    title={canFullscreen ? "Click to fullscreen, ESC to exit" : undefined}
                  >
                    <div className="meeting-room-tile-avatar" style={{ overflow: "hidden" }}>
                      {showVideo ? (
                        <video
                          autoPlay
                          playsInline
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          ref={(el) => {
                            if (el && stream && el.srcObject !== stream) {
                              el.srcObject = stream;
                              el.play?.().catch(() => {});
                            }
                          }}
                        />
                      ) : (member_photo ? (
                        <img
                          src={member_photo}
                          alt={label}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span className="meeting-room-tile-initial">
                          {String(label).trim().charAt(0).toUpperCase() || "M"}
                        </span>
                      ))}
                    </div>
                    {(() => {
                      const entry = lookupKeys.reduce((acc, k) => acc || reactionsMap[k], null);
                      if (!entry) return null;
                      return Object.entries(entry).map(([type, names]) => (
                        <div key={type} className="meeting-room-reaction" title={type}>
                          <div className="reaction-icon">{getReactionIcon(type)}</div>
                          <div className="reaction-names">{names.map((n) => (
                            <div key={n} className="reaction-name">{n}</div>
                          ))}</div>
                        </div>
                      ));
                    })()}
                    {/* Raised hand indicator for remote participants */}
                    {lookupKeys.some((k) => handRaisedMap[k]) && (
                      <div className="meeting-room-hand-overlay" title="Raised hand">
                        <HandWaving size={18} weight="bold" />
                      </div>
                    )}
                    <span className="meeting-room-tile-badge admin">{label}</span>
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

      {fullscreenOverlay && createPortal(
        <div
          className="meeting-room-fullscreen-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen video"
          onClick={() => setFullscreenOverlay(null)}
          onKeyDown={(e) => e.key === "Escape" && setFullscreenOverlay(null)}
        >
          <video
            ref={fullscreenVideoRef}
            autoPlay
            playsInline
            muted={false}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="meeting-room-fullscreen-label">{fullscreenOverlay.label}</span>
          <button
            type="button"
            className="meeting-room-fullscreen-close"
            onClick={(e) => { e.stopPropagation(); setFullscreenOverlay(null); }}
            aria-label="Close fullscreen"
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MeetingRoom;
