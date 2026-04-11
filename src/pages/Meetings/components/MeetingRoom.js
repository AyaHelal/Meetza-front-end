import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./MeetingRoom.css";
import MeetingRoomHeader from "./MeetingRoomHeader";
import MeetingRoomFullscreenVideos from "./MeetingRoomFullscreenVideos";
import MeetingRoomSliderViewport from "./MeetingRoomSliderViewport";
import MeetingRoomGrid from "./MeetingRoomGrid";
import MeetingRoomSingleView from "./MeetingRoomSingleView";
import MeetingRoomScreenPlaceholder from "./MeetingRoomScreenPlaceholder";
import MeetingRoomFloatingEmojis from "./MeetingRoomFloatingEmojis";
import MeetingRoomSliderDots from "./MeetingRoomSliderDots";
import MeetingRoomControlBar from "./MeetingRoomControlBar";
import MeetingRoomReactionsContainer from "./MeetingRoomReactionsContainer";
import { toParticipant, getReactionIcon, getCameraTrack, getScreenShareTrack, isScreenShareVideoTrack } from "./meetingRoomUtils";
import { useMeetingRoomSocketListeners } from "../hooks/useMeetingRoomSocketListeners";
import { useMeetingRoomFullscreen } from "../hooks/useMeetingRoomFullscreen";
import { useMeetingRoomMediaEffects } from "../hooks/useMeetingRoomMediaEffects";
import { useMeetingRoomMeetingId } from "../hooks/useMeetingRoomMeetingId";
import { useMeetingRoomMeetingLifecycle } from "../hooks/useMeetingRoomMeetingLifecycle";
import { useMeetingRoomRtc } from "../hooks/useMeetingRoomRtc";
import { useMeetingChat } from "../hooks/useMeetingChat";
import { useMeetingHand } from "../hooks/useMeetingHand";
import { useMeetingRoomReactions } from "../hooks/useMeetingRoomReactions";
import { useMeetingRoomUnifiedTiles } from "../hooks/useMeetingRoomUnifiedTiles";
import { useMeetingRoomParticipantHelpers } from "../hooks/useMeetingRoomParticipantHelpers";
import { useMeetingRecording } from "../hooks/useMeetingRecording";
import { useMeetingInfo } from "../hooks/useMeetingInfo";
import { useMeetingPreJoin } from "../hooks/useMeetingPreJoin";
import { useMeetingLifecycleHandlers } from "../hooks/useMeetingLifecycleHandlers";
import MeetingRoomPreJoinModal from "./MeetingRoomPreJoinModal";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";
import { smartToast } from "../../../API/toastManager";
import { useSocket } from "../../../context/SocketContext";
import { AuthContext } from "../../../context/AuthContext";
import { useMeetingContext } from "../../../context/MeetingContext";
import { useMediaContext } from "../../../context/MediaContext";

/** Survives React StrictMode remount so we do not open pre-join twice for the same meeting tab session. */
const preJoinUiGateStorageKey = (meetingId) => `meetza_preJoinUiGate_${String(meetingId)}`;

/** Same logical meeting must use one string id — otherwise `5 !== "5"` resets pre-join state and the modal reopens after Enter. */
const normalizeMeetingId = (id) => (id == null || id === "" ? null : String(id));

const MeetingRoom = ({ recordRegionRef }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [handRaisedMap, setHandRaisedMap] = useState(() => ({}));
  const [localParticipantVolume, setLocalParticipantVolume] = useState({});
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
  const [screenSharing, setScreenSharing] = useState(false);
  const [showSaveRecordingModal, setShowSaveRecordingModal] = useState(false);

  const meetingIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const localVideoRef2 = useRef(null);
  const sliderViewportRef = useRef(null);
  const recordingStartedRef = useRef(false);
  const recordingPayloadRef = useRef(null);
  const remoteVideoRefsMap = useRef(new Map());
  const localParticipantAudioMutedRef = useRef({});
  const localParticipantVolumeRef = useRef({});
  const userLeftMeetingRef = useRef(false);
  const lastMeetingIdForPreJoinRef = useRef(null);
  const preJoinPromptedRef = useRef({});
  const preJoinCompletedRef = useRef({});
  const preJoinOpenedThisLoadRef = useRef(false);
  const userDismissedPreJoinRef = useRef({});
  const [preJoinDismissTick, setPreJoinDismissTick] = useState(0);
  /** After a full page reload while this meeting is open, reset join/pre-join once so user goes through join again. */
  const reloadJoinResetDoneForMidRef = useRef(null);

  const meetingId = useMeetingRoomMeetingId({
    location,
    searchParams,
    meetingIdRef,
    setMeetingId,
    setMediaContextMeetingId,
  });

  const selfMemberIdForInfo = user?.id ?? user?.member_id ?? null;
  const { meetingInfo, isMeetingAdmin } = useMeetingInfo(meetingId, selfMemberIdForInfo);

  useEffect(() => {
    try {
      sessionStorage.setItem("meetza_audioMuted", String(audioMuted));
      sessionStorage.setItem("meetza_videoMuted", String(videoMuted));
    } catch { /* ignore */ }
  }, [audioMuted, videoMuted]);

  const handlePreJoinDismiss = useCallback(() => {
    const mid = normalizeMeetingId(meetingIdRef.current ?? meetingId);
    if (mid != null) {
      userDismissedPreJoinRef.current[mid] = true;
      try {
        sessionStorage.removeItem(preJoinUiGateStorageKey(mid));
      } catch {
        /* ignore */
      }
    }
    preJoinOpenedThisLoadRef.current = false;
    setPreJoinDismissTick((t) => t + 1);
  }, [meetingId]);

  const rtc = useMeetingRoomRtc({
    socket,
    isConnected,
    meetingIdRef,
    hasJoined,
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
    audioMuted,
    setParticipants,
    setHasJoined,
    setMediaContextHasJoined,
    setMediaStateMap,
    setScreenSharing,
    user,
    location,
    getPeerConnections,
    registerPeerConnection,
    unregisterPeerConnection,
    localVideoRef,
    localVideoRef2,
    meetingSpeakerMuted,
    localParticipantAudioMuted,
    localParticipantVolume,
    remoteVideoRefsMap,
    screenTrackRef,
  });

  const preJoin = useMeetingPreJoin((stream, videoMuted, audioMuted) => {
    const mid = normalizeMeetingId(meetingIdRef.current ?? meetingId);
    if (!mid) return;
    const keysToMark = [mid];

    try {
      const active = normalizeMeetingId(sessionStorage.getItem("activeMeetingId"));
      if (active && active !== mid) keysToMark.push(active);
    } catch { /* ignore */ }

    keysToMark.forEach((key) => {
      preJoinCompletedRef.current[key] = true;
      preJoinPromptedRef.current[key] = true;
      try {
        sessionStorage.setItem(`meeting_preJoinCompleted_${key}`, "true");
      } catch { /* ignore */ }
    });
    // Pre-join UI finished — allow RTC effect path; keep refs aligned with `waitingOnPreJoinUi` / `shouldShowPreJoin`.
    preJoinOpenedThisLoadRef.current = false;
    try {
      sessionStorage.removeItem(preJoinUiGateStorageKey(mid));
    } catch {
      /* ignore */
    }
    rtc.startJoinRef.current?.({ preObtainedStream: stream, initialVideoMuted: videoMuted, initialAudioMuted: audioMuted });
  }, handlePreJoinDismiss);

  const showPreJoinModalRef = useRef(preJoin.showPreJoinModal);
  showPreJoinModalRef.current = preJoin.showPreJoinModal;

  const chat = useMeetingChat({
    socket,
    isConnected,
    meetingIdRef,
    meetingId,
    addChatMessage,
    user,
  });

  const hand = useMeetingHand({ meetingIdRef, socket });

  const setShowPreJoinModal = preJoin.setShowPreJoinModal;
  useEffect(() => {
    if (!socket || !isConnected) return;
    const mid = normalizeMeetingId(meetingIdRef.current ?? meetingId);
    if (!mid) return;

    const isPageReload = (() => {
      try {
        const navEntries = performance?.getEntriesByType?.("navigation");
        const navType = navEntries && navEntries[0] ? navEntries[0].type : null;
        if (navType) return navType === "reload";
        return performance.navigation?.type === 1;
      } catch {
        return false;
      }
    })();

    if (
      isPageReload &&
      reloadJoinResetDoneForMidRef.current !== mid
    ) {
      reloadJoinResetDoneForMidRef.current = mid;
      preJoinCompletedRef.current = {};
      preJoinOpenedThisLoadRef.current = false;
      preJoinPromptedRef.current = {};
      try {
        sessionStorage.removeItem(`meeting_preJoinCompleted_${mid}`);
        sessionStorage.removeItem(preJoinUiGateStorageKey(mid));
        sessionStorage.removeItem(`meeting_hasJoined_${mid}`);
      } catch {
        /* ignore */
      }
    }

    const prevMidNorm = normalizeMeetingId(lastMeetingIdForPreJoinRef.current);
    if (prevMidNorm !== mid) {
      if (prevMidNorm != null) {
        reloadJoinResetDoneForMidRef.current = null;
        try {
          sessionStorage.removeItem(preJoinUiGateStorageKey(prevMidNorm));
        } catch {
          /* ignore */
        }
      }
      lastMeetingIdForPreJoinRef.current = mid;
      userLeftMeetingRef.current = false;
      preJoinOpenedThisLoadRef.current = false;
      preJoinPromptedRef.current = {};
      userDismissedPreJoinRef.current = {};

      let completedForMidInStorage = false;
      try {
        completedForMidInStorage =
          sessionStorage.getItem(`meeting_preJoinCompleted_${mid}`) === "true";
      } catch {
        /* ignore */
      }

      if (prevMidNorm != null) {
        // Switched to another meeting — fresh pre-join for `mid`.
        preJoinCompletedRef.current = {};
        try {
          sessionStorage.removeItem(`meeting_preJoinCompleted_${mid}`);
          sessionStorage.removeItem(preJoinUiGateStorageKey(mid));
        } catch {
          /* ignore */
        }
      } else {
        // First attach for this MeetingRoom instance (includes React StrictMode remount after Enter).
        // Do NOT wipe meeting_preJoinCompleted_* here — that would erase completion from the previous mount
        // and reopen the camera/mic modal a second time.
        if (completedForMidInStorage) {
          preJoinCompletedRef.current[mid] = true;
        } else {
          preJoinCompletedRef.current = {};
          try {
            sessionStorage.removeItem(`meeting_preJoinCompleted_${mid}`);
            sessionStorage.removeItem(preJoinUiGateStorageKey(mid));
          } catch {
            /* ignore */
          }
        }
      }
    }
    if (userLeftMeetingRef.current) return;
    const stableKey = mid;
    const completedFromStorage = (() => {
      try {
        return sessionStorage.getItem(`meeting_preJoinCompleted_${stableKey}`) === "true";
      } catch {
        return false;
      }
    })();
    // After a full page reload, show pre-join again; sessionStorage completion only applies within same document load.
    const alreadyEnteredThisLoad =
      !!preJoinCompletedRef.current[stableKey] || (!isPageReload && completedFromStorage);

    // Modal is open and user has not confirmed — do not start RTC or re-trigger logic (fixes socket reconnect / dep churn).
    const waitingOnPreJoinUi =
      preJoinOpenedThisLoadRef.current && !preJoinCompletedRef.current[stableKey];
    if (waitingOnPreJoinUi) {
      return;
    }

    // One gate: not completed yet, not already in room, not already showing pre-join this visit.
    // Avoid (isPageReload && isReturning) — it kept shouldShowPreJoin true after the modal opened and caused duplicate opens / races after refresh.
    const shouldShowPreJoin =
      !alreadyEnteredThisLoad &&
      !hasJoined &&
      !preJoinOpenedThisLoadRef.current &&
      !userDismissedPreJoinRef.current[stableKey];

    if (shouldShowPreJoin) {
      let gateAlreadySet = false;
      try {
        gateAlreadySet = sessionStorage.getItem(preJoinUiGateStorageKey(stableKey)) === "1";
      } catch {
        /* ignore */
      }
      if (gateAlreadySet) {
        const preJoinDone =
          sessionStorage.getItem(`meeting_preJoinCompleted_${stableKey}`) === "true";
        if (preJoinDone) {
          preJoinCompletedRef.current[stableKey] = true;
          preJoinOpenedThisLoadRef.current = false;
          try {
            sessionStorage.removeItem(preJoinUiGateStorageKey(stableKey));
          } catch {
            /* ignore */
          }
          // Remount / StrictMode: gate stuck from first open but user already confirmed — do not reopen modal.
        } else {
          preJoinPromptedRef.current[stableKey] = true;
          preJoinOpenedThisLoadRef.current = true;
          if (!showPreJoinModalRef.current) setShowPreJoinModal(true);
          return;
        }
      } else {
        try {
          sessionStorage.setItem(preJoinUiGateStorageKey(stableKey), "1");
        } catch {
          /* ignore */
        }
        preJoinPromptedRef.current[stableKey] = true;
        preJoinOpenedThisLoadRef.current = true;
        setShowPreJoinModal(true);
        return;
      }
    }
    if (userDismissedPreJoinRef.current[stableKey]) {
      return;
    }
    rtc.startAndJoinMeetingRtc().then((result) => {
      if (result?.error) smartToast.error(result.error);
    });
  }, [meetingId, socket, isConnected, hasJoined, setShowPreJoinModal, preJoinDismissTick]);

  useEffect(() => {
    if (!setMeetingMediaRefs) return;
    setMeetingMediaRefs({
      remoteVideoRefsMap,
      localParticipantAudioMutedRef,
      localParticipantVolumeRef,
    });
    return () => setMeetingMediaRefs(null);
  }, [setMeetingMediaRefs]);

  useEffect(() => {
    localParticipantAudioMutedRef.current = localParticipantAudioMuted;
    localParticipantVolumeRef.current = localParticipantVolume;
  }, [localParticipantAudioMuted, localParticipantVolume]);

  useEffect(() => {
    const map = remoteVideoRefsMap.current;
    const lap = localParticipantAudioMutedRef.current;
    const lpv = localParticipantVolumeRef.current;
    if (map && map.forEach) {
      map.forEach((el, socketId) => {
        if (el) {
          el.muted = !!meetingSpeakerMuted || !!lap[socketId];
          el.volume = meetingSpeakerMuted ? 0 : (lpv[socketId] ?? 1);
        }
      });
    }
  }, [meetingSpeakerMuted, localParticipantAudioMuted, localParticipantVolume]);

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
    ensureMediaTracks: rtc.ensureMediaTracks,
    remoteStreams: rtc.remoteStreams,
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
    peerMetaRef: rtc.peerMetaRef,
    remoteStreams: rtc.remoteStreams,
  });

  const { unifiedTiles, memberTiles, adminTile, adminTileForMembers } = useMeetingRoomUnifiedTiles({
    participants,
    remoteStreams: rtc.remoteStreams,
    socket,
    selfMemberId,
    videoMuted,
    screenSharing,
    mediaStateMap,
    localStreamRef,
    localStream,
    isMeetingAdmin,
    meetingInfo,
    currentUserFromToken: user,
  });

  const {
    isRecording,
    isRecordingPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useMeetingRecording({
    localStreamRef,
    remoteStreams: rtc.remoteStreams,
    recordingPayloadRef,
    recordingStartedRef,
    meetingId,
    meetingInfo,
    hasJoined,
    isMeetingAdmin,
  });

  const handleRecordingStartOrResume = useCallback(() => {
    if (isRecording && isRecordingPaused) {
      resumeRecording();
    } else if (!isRecording) {
      startRecording();
    }
  }, [isRecording, isRecordingPaused, resumeRecording, startRecording]);

  const handleRecordingStop = useCallback(() => {
    if (isRecording && !isRecordingPaused) {
      pauseRecording();
    }
  }, [isRecording, isRecordingPaused, pauseRecording]);

  const handleRecordingEnd = useCallback(() => {
    if (!isRecording) return;
    setShowSaveRecordingModal(true);
  }, [isRecording]);

  const handleConfirmSaveRecording = useCallback(() => {
    setShowSaveRecordingModal(false);
    stopRecording(recordingPayloadRef?.current);
  }, [stopRecording]);

  const handleCancelSaveRecording = useCallback(() => {
    setShowSaveRecordingModal(false);
    cancelRecording();
  }, [cancelRecording]);

  const { handleLeaveMeeting: handleLeaveMeetingBase, handleMeetingEnded } = useMeetingLifecycleHandlers({
    meetingId,
    meetingInfo,
    isRecording,
    stopRecording,
    stopMeetingRtc: rtc.stopMeetingRtc,
    navigate,
    socket,
    recordingStartedRef,
  });
  const handleLeaveMeeting = useCallback(() => {
    userLeftMeetingRef.current = true;
    try {
      const m = normalizeMeetingId(meetingIdRef.current ?? meetingId);
      if (m != null) sessionStorage.removeItem(preJoinUiGateStorageKey(m));
    } catch {
      /* ignore */
    }
    handleLeaveMeetingBase();
  }, [handleLeaveMeetingBase, meetingId]);

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
    handleSendLike,
    selectEmoji,
  } = useMeetingRoomReactions({
    meetingId,
    setHandRaisedMap,
    meetingIdRef,
    socket,
    user,
    selfMemberId,
    selfEmail,
  });

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
    remoteStreams: rtc.remoteStreams,
  });

  useMeetingRoomMeetingLifecycle({
    meetingId,
    meetingIdRef,
    socket,
    onMeetingEnded: handleMeetingEnded,
    setMeetingTitle,
  });

  /** Single view (slide 1): show screen share when sharing, else camera/photo. Sync localVideoRef2 to the right stream. */
  useEffect(() => {
    const stream = localStreamRef?.current ?? localStream ?? null;
    const el = localVideoRef2?.current;
    if (!el || !stream) return;
    if (screenSharing) {
      const screenTrack = getScreenShareTrack(stream);
      if (screenTrack) {
        const screenOnly = new MediaStream([screenTrack]);
        if (el.srcObject !== screenOnly) {
          el.srcObject = screenOnly;
        }
      }
    } else {
      const cameraTrack = getCameraTrack(stream);
      const displayStream = cameraTrack
        ? new MediaStream([cameraTrack, ...stream.getAudioTracks()])
        : new MediaStream(stream.getAudioTracks());
      if (el.srcObject !== displayStream) {
        el.srcObject = displayStream;
      }
    }
  }, [screenSharing, localStream]);

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

  useMeetingRoomSocketListeners({
    socket,
    meetingIdRef,
    peersRef: rtc.peersRef,
    peerMetaRef: rtc.peerMetaRef,
    politeRef: rtc.politeRef,
    makingOfferRef: rtc.makingOfferRef,
    iceQueueRef: rtc.iceQueueRef,
    setParticipants,
    setHandRaisedMap,
    setReactionsMap,
    setMediaStateMap,
    setRemoteStreams: rtc.setRemoteStreams,
    toParticipantFn: toParticipant,
    localStreamRef,
    ensureLocalMedia: rtc.ensureLocalMedia,
    createPeerConnection: rtc.createPeerConnection,
    createAndSendOffer: rtc.createAndSendOffer,
    closePeer: rtc.closePeer,
    getReactionIcon,
    addReactionToMap,
    spawnFloatingEmojis,
    selfMemberId,
    setAudioMuted,
    setContextAudioMuted,
    setLocalParticipantAudioMuted,
    getVideoMuted: () => videoMuted,
  });

  const handleToggleScreenShare = async () => {
    const result = await rtc.handleToggleScreenShare();
    if (result?.error) smartToast.error(result.error);
  };

  return (
    <div className="meeting-room">
      <ConfirmDeleteModal
        show={showSaveRecordingModal}
        onClose={handleCancelSaveRecording}
        onConfirm={handleConfirmSaveRecording}
        title="Save recording"
        message="Do you want to save this recording and upload it to the server? If you cancel, the recording will be discarded."
        confirmLabel="OK"
        confirmPrimary
      />

      <MeetingRoomPreJoinModal
        visible={preJoin.showPreJoinModal}
        stream={preJoin.preJoinStream}
        videoMuted={preJoin.preJoinVideoMuted}
        audioMuted={preJoin.preJoinAudioMuted}
        loading={preJoin.preJoinLoading}
        error={preJoin.preJoinError}
        videoRef={preJoin.preJoinVideoRef}
        onClose={preJoin.handlePreJoinClose}
        onToggleVideo={preJoin.handlePreJoinToggleVideo}
        onToggleAudio={preJoin.handlePreJoinToggleAudio}
        onEnter={preJoin.handlePreJoinEnter}
        onClearError={preJoin.clearPreJoinError}
      />

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
            handRaised={hand.handRaised}
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
            handRaised={hand.handRaised}
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
        showCommentInput={chat.showCommentInput}
        setShowCommentInput={chat.setShowCommentInput}
        commentText={chat.commentText}
        setCommentText={chat.setCommentText}
        audioMuted={audioMuted}
        videoMuted={videoMuted}
        handRaised={hand.handRaised}
        screenSharing={screenSharing}
        meetingId={meetingId}
        unifiedTiles={unifiedTiles}
        localParticipantAudioMuted={localParticipantAudioMuted}
        handleToggleAudio={rtc.handleToggleAudio}
        handleToggleHand={hand.handleToggleHand}
        handleToggleVideo={rtc.handleToggleVideo}
        handleToggleScreenShare={handleToggleScreenShare}
        setShowEmojiPicker={setShowEmojiPicker}
        handleSendComment={chat.handleSendComment}
        handleMuteUnmuteAllParticipants={handleMuteUnmuteAllParticipants}
        socket={socket}
        isConnected={isConnected}
        showEmojiPicker={showEmojiPicker}
        emojiPickerRef={emojiPickerRef}
        emojiList={emojiList}
        selectEmoji={selectEmoji}
        isMeetingAdmin={isMeetingAdmin}
        isRecording={isRecording}
        isRecordingPaused={isRecordingPaused}
        onStartRecording={handleRecordingStartOrResume}
        onStopRecording={handleRecordingStop}
        onEndRecording={handleRecordingEnd}
      />

      <MeetingRoomReactionsContainer reactionsMap={reactionsMap} getReactionIcon={getReactionIcon} />
    </div>
  );
};

export default MeetingRoom;