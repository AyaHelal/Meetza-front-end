import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Microphone,
  VideoCamera,
  HandWaving,
  ImageSquare,
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
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]); // from REST: [{member_id, member_name, member_photo, ...}]
  const [loadingParticipants, setLoadingParticipants] = useState(false);
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
  const localVideoRef = useRef(null);

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

  const upsertRemoteStream = useCallback((socketId, stream) => {
    if (!socketId || !stream) return;
    setRemoteStreams((prev) => {
      const idx = prev.findIndex((x) => x.socketId === socketId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { socketId, stream };
        return next;
      }
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
        upsertRemoteStream(peerSocketId, stream);
      }
    };

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    }

    return pc;
  }, [socket, upsertRemoteStream]);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);

    // store camera track (used to restore after screen share)
    cameraVideoTrackRef.current = stream.getVideoTracks()?.[0] || null;

    // apply current mute flags
    stream.getAudioTracks().forEach((t) => (t.enabled = !audioMuted));
    stream.getVideoTracks().forEach((t) => (t.enabled = !videoMuted));

    // attach to local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, [audioMuted, videoMuted]);

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

    socket.emit("joinMeetingRoom", { meetingId: mid }, async (ack) => {
      if (!ack?.ok) {
        console.error("❌ joinMeetingRoom failed:", ack);
        smartToast.error(ack?.message || "Failed to join meeting room.");
        startedRef.current = false;
        return;
      }

      const participants = Array.isArray(ack?.participants) ? ack.participants : [];
      for (const p of participants) {
        const peerSocketId = p?.socketId || p?.id || p;
        if (!peerSocketId) continue;
        if (peerSocketId === socket.id) continue;
        if (peersRef.current.has(peerSocketId)) continue;

        // Store any metadata if backend provides it
        const meta = {
          member_id: p?.member_id || p?.memberId || p?.userId || p?.user_id,
          member_name: p?.member_name || p?.memberName || p?.name,
          member_photo: p?.member_photo || p?.memberPhoto || p?.photo,
        };
        if (meta.member_id || meta.member_name || meta.member_photo) {
          peerMetaRef.current.set(peerSocketId, meta);
        }

        const pc = createPeerConnection(peerSocketId);
        peersRef.current.set(peerSocketId, pc);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit(
            "webrtcOffer",
            { toSocketId: peerSocketId, meetingId: mid, sdp: offer },
            () => { }
          );
        } catch (err) {
          console.error("❌ Error creating/sending offer:", err);
        }
      }
    });
  }, [createPeerConnection, ensureLocalMedia, isConnected, socket]);

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

    setScreenSharing(false);
    startedRef.current = false;
  }, [closePeer, socket]);

  // Auto-start RTC when entering meeting page with meetingId
  useEffect(() => {
    if (!meetingId || !socket || !isConnected) return;
    startAndJoinMeetingRtc();

    return () => {
      // cleanup on unmount
      stopMeetingRtc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, socket, isConnected]);

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
      const peerSocketId = data?.socketId || data?.id || data?.fromSocketId;
      const mid = data?.meetingId;
      if (!peerSocketId || !mid) return;
      if (mid !== meetingIdRef.current) return;
      if (peerSocketId === socket.id) return;
      if (peersRef.current.has(peerSocketId)) return;

      // store metadata if provided
      const meta = {
        member_id: data?.member_id || data?.memberId || data?.userId || data?.user_id,
        member_name: data?.member_name || data?.memberName || data?.name,
        member_photo: data?.member_photo || data?.memberPhoto || data?.photo,
      };
      if (meta.member_id || meta.member_name || meta.member_photo) {
        peerMetaRef.current.set(peerSocketId, meta);
      }

      const pc = createPeerConnection(peerSocketId);
      peersRef.current.set(peerSocketId, pc);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit(
          "webrtcOffer",
          { toSocketId: peerSocketId, meetingId: mid, sdp: offer },
          () => { }
        );
      } catch (err) {
        console.error("❌ Error creating offer for new participant:", err);
      }
    };

    const onParticipantLeft = (data) => {
      const peerSocketId = data?.socketId || data?.id || data?.fromSocketId;
      const mid = data?.meetingId;
      if (!peerSocketId || !mid) return;
      if (mid !== meetingIdRef.current) return;
      peerMetaRef.current.delete(peerSocketId);
      closePeer(peerSocketId);
    };

    const onWebrtcOffer = async (data) => {
      const fromSocketId = data?.fromSocketId || data?.socketId || data?.from;
      const mid = data?.meetingId;
      const sdp = data?.sdp;
      if (!fromSocketId || !mid || !sdp) return;
      if (mid !== meetingIdRef.current) return;

      let pc = peersRef.current.get(fromSocketId);
      if (!pc) {
        pc = createPeerConnection(fromSocketId);
        peersRef.current.set(fromSocketId, pc);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(
          "webrtcAnswer",
          { toSocketId: fromSocketId, meetingId: mid, sdp: answer },
          () => { }
        );
      } catch (err) {
        console.error("❌ Error handling offer:", err);
      }
    };

    const onWebrtcAnswer = async (data) => {
      const fromSocketId = data?.fromSocketId || data?.socketId || data?.from;
      const mid = data?.meetingId;
      const sdp = data?.sdp;
      if (!fromSocketId || !mid || !sdp) return;
      if (mid !== meetingIdRef.current) return;

      const pc = peersRef.current.get(fromSocketId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error("❌ Error setting remote answer:", err);
      }
    };

    const onIceCandidate = async (data) => {
      const fromSocketId = data?.fromSocketId || data?.socketId || data?.from;
      const mid = data?.meetingId;
      const candidate = data?.candidate;
      if (!fromSocketId || !mid || !candidate) return;
      if (mid !== meetingIdRef.current) return;

      const pc = peersRef.current.get(fromSocketId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("❌ Error adding ICE candidate:", err);
      }
    };

    socket.on("participantJoined", onParticipantJoined);
    socket.on("participantLeft", onParticipantLeft);
    socket.on("webrtcOffer", onWebrtcOffer);
    socket.on("webrtcAnswer", onWebrtcAnswer);
    socket.on("webrtcIceCandidate", onIceCandidate);

    return () => {
      socket.off("participantJoined", onParticipantJoined);
      socket.off("participantLeft", onParticipantLeft);
      socket.off("webrtcOffer", onWebrtcOffer);
      socket.off("webrtcAnswer", onWebrtcAnswer);
      socket.off("webrtcIceCandidate", onIceCandidate);
    };
  }, [closePeer, createPeerConnection, socket]);

  const getPeerLabel = useCallback((socketId) => {
    const meta = peerMetaRef.current.get(socketId);
    return meta?.member_name || meta?.member_id || socketId;
  }, []);

  const selfMemberId = useMemo(() => user?.id || user?.member_id || null, [user?.id, user?.member_id]);
  const selfEmail = useMemo(() => user?.email || null, [user?.email]);

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
      if (!memberId) return null;

      // Try to match REST participant -> socketId via metadata received in socket events/acks
      for (const [socketId, meta] of peerMetaRef.current.entries()) {
        if (meta?.member_id && String(meta.member_id) === String(memberId)) {
          return remoteStreams.find((x) => x.socketId === socketId)?.stream || null;
        }
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

  const handleToggleAudio = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    const mid = meetingIdRef.current;
    if (socket && mid) {
      socket.emit("updateMediaState", { meetingId: mid, audioMuted: next, videoMuted });
    }
  };

  const handleToggleVideo = () => {
    const next = !videoMuted;
    setVideoMuted(next);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    }
    const mid = meetingIdRef.current;
    if (socket && mid) {
      socket.emit("updateMediaState", { meetingId: mid, audioMuted, videoMuted: next });
    }
  };

  const handleToggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    const mid = meetingIdRef.current;
    if (socket && mid) {
      socket.emit("raiseHand", { meetingId: mid, raised: next });
    }
  };

  const handleSendLike = () => {
    const mid = meetingIdRef.current;
    if (socket && mid) {
      socket.emit("reaction", { meetingId: mid, type: "like" });
    }
  };

  const handleToggleScreenShare = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (!screenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()?.[0];
        if (!screenTrack) return;

        setScreenSharing(true);

        // replace outgoing video track in all peer connections
        for (const pc of peersRef.current.values()) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) await sender.replaceTrack(screenTrack);
        }

        // show locally
        const newStream = new MediaStream([
          ...stream.getAudioTracks(),
          screenTrack,
        ]);
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }

        // when user stops share, restore camera
        screenTrack.onended = async () => {
          try {
            const cameraTrack = cameraVideoTrackRef.current;
            if (!cameraTrack) return;

            for (const pc of peersRef.current.values()) {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (sender) await sender.replaceTrack(cameraTrack);
            }

            const restored = new MediaStream([
              ...stream.getAudioTracks(),
              cameraTrack,
            ]);
            localStreamRef.current = restored;
            setLocalStream(restored);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = restored;
            }
          } finally {
            setScreenSharing(false);
          }
        };
      } catch (e) {
        console.error("❌ Screen share failed:", e);
        smartToast.error("Screen share failed.");
      }
    } else {
      // If already sharing, stopping is handled by track.onended
      // (User can stop via browser UI)
      smartToast.info("Stop screen share from your browser control.");
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

      <div className="meeting-room-slider-viewport">
        <div
          className={`meeting-room-slider-track ${activeSlide === 1 ? 'single-view' : ''}`}
          style={{ transform: `translateX(-${activeSlide * (100 / 3)}%)` }}
        >
          <div className="meeting-room-slide">
            <div className="meeting-room-grid">
              {/* Local tile */}
              <div className="meeting-room-tile">
                <div className="meeting-room-tile-avatar" style={{ overflow: "hidden" }}>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <span className="meeting-room-tile-badge you">You</span>
              </div>

              {/* Participants tiles (from GET /meeting/{id}/participants) */}
              {loadingParticipants ? (
                <div className="meeting-room-tile">
                  <div className="meeting-room-tile-avatar">
                    <span className="meeting-room-tile-initial">...</span>
                  </div>
                </div>
              ) : displayParticipants.length === 0 ? null : (
                displayParticipants.map((p) => {
                  const label = p?.member_name || "Member";
                  const stream = getParticipantStream(p);
                  return (
                    <div key={p?.id || p?.member_id || label} className="meeting-room-tile">
                      <div className="meeting-room-tile-avatar" style={{ overflow: "hidden" }}>
                        {stream ? (
                          <video
                            autoPlay
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            ref={(el) => {
                              if (el && el.srcObject !== stream) {
                                el.srcObject = stream;
                                el.play?.().catch(() => { });
                              }
                            }}
                          />
                        ) : p?.member_photo ? (
                          <img
                            src={p.member_photo}
                            alt={label}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span className="meeting-room-tile-initial">
                            {String(label).trim().charAt(0).toUpperCase() || "M"}
                          </span>
                        )}
                      </div>
                      <span className="meeting-room-tile-badge admin">{label}</span>
                    </div>
                  );
                })
              )}

              {/* Unmatched remote streams (if backend doesn't provide member_id mapping) */}
              {remoteStreams
                .filter(({ socketId }) => !peerMetaRef.current.get(socketId)?.member_id)
                .map(({ socketId, stream }) => (
                  <div key={`unmatched-${socketId}`} className="meeting-room-tile">
                    <div className="meeting-room-tile-avatar" style={{ overflow: "hidden" }}>
                      <video
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        ref={(el) => {
                          if (el && stream && el.srcObject !== stream) {
                            el.srcObject = stream;
                            el.play?.().catch(() => { });
                          }
                        }}
                      />
                    </div>
                    <span className="meeting-room-tile-badge admin">{getPeerLabel(socketId)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="meeting-room-slide">
            <div className="meeting-room-single">
              <div className="meeting-room-tile-large">
                <div className="meeting-room-tile-avatar large">
                  <span className="meeting-room-tile-initial">U</span>
                </div>
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
            <Microphone size={22} weight="regular" />
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
            <ImageSquare size={22} weight="regular" />
          </button>
          <button
            type="button"
            className="meeting-room-control-btn"
            aria-label="Reactions"
            onClick={handleSendLike}
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
      </div>
    </div>
  );
};

export default MeetingRoom;
