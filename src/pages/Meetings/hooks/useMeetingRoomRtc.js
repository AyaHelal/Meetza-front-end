/**
 * Composes all meeting RTC hooks and returns a single API for the MeetingRoom component.
 * Breaks ensureLocalMedia cycle via ref.
 */
import { useEffect, useRef } from "react";
import { useMeetingStreams } from "./useMeetingStreams";
import { useMeetingPeers } from "./useMeetingPeers";
import { useMeetingMedia } from "./useMeetingMedia";
import { useMeetingJoin } from "./useMeetingJoin";
import { useMeetingToggleAudio } from "./useMeetingToggleAudio";
import { useMeetingToggleVideo } from "./useMeetingToggleVideo";
import { useMeetingScreenShare } from "./useMeetingScreenShare";

export function useMeetingRoomRtc(opts) {
  const ensureLocalMediaRef = useRef(null);
  const peerMetaRef = useRef(new Map());
  const startedRef = useRef(false);

  const streams = useMeetingStreams({
    meetingSpeakerMuted: opts.meetingSpeakerMuted,
    localParticipantAudioMuted: opts.localParticipantAudioMuted,
    localParticipantVolume: opts.localParticipantVolume,
    remoteVideoRefsMap: opts.remoteVideoRefsMap,
  });

  const peers = useMeetingPeers({
    socket: opts.socket,
    meetingIdRef: opts.meetingIdRef,
    localStreamRef: opts.localStreamRef,
    setLocalStream: opts.setLocalStream,
    upsertRemoteStream: streams.upsertRemoteStream,
    removeRemoteStream: streams.removeRemoteStream,
    registerPeerConnection: opts.registerPeerConnection,
    unregisterPeerConnection: opts.unregisterPeerConnection,
    setMediaStateMap: opts.setMediaStateMap,
    setRemoteStreams: streams.setRemoteStreams,
    ensureLocalMedia: () => ensureLocalMediaRef.current?.(),
  });

  const media = useMeetingMedia({
    localStreamRef: opts.localStreamRef,
    setLocalStream: opts.setLocalStream,
    peersRef: peers.peersRef,
    cameraVideoTrackRef: opts.cameraVideoTrackRef,
    addTracksToAllPeers: peers.addTracksToAllPeers,
    audioMuted: opts.audioMuted,
    videoMuted: opts.videoMuted,
  });

  useEffect(() => {
    ensureLocalMediaRef.current = media.ensureLocalMedia;
  }, [media.ensureLocalMedia]);

  const join = useMeetingJoin({
    ...opts,
    startedRef,
    hasJoined: opts.hasJoined,
    audioMuted: opts.audioMuted,
    videoMuted: opts.videoMuted,
    peersRef: peers.peersRef,
    politeRef: peers.politeRef,
    makingOfferRef: peers.makingOfferRef,
    peerMetaRef,
    setRemoteStreams: streams.setRemoteStreams,
    getPeerConnections: opts.getPeerConnections,
    registerPeerConnection: opts.registerPeerConnection,
    unregisterPeerConnection: opts.unregisterPeerConnection,
    createPeerConnection: peers.createPeerConnection,
    closePeer: peers.closePeer,
    createAndSendOffer: peers.createAndSendOffer,
    addTracksToAllPeers: peers.addTracksToAllPeers,
    ensureLocalMedia: media.ensureLocalMedia,
  });

  const toggleAudio = useMeetingToggleAudio({
    ...opts,
    peersRef: peers.peersRef,
    makingOfferRef: peers.makingOfferRef,
    ensureMediaTracks: media.ensureMediaTracks,
  });

  const toggleVideo = useMeetingToggleVideo({
    ...opts,
    peersRef: peers.peersRef,
    makingOfferRef: peers.makingOfferRef,
    ensureMediaTracks: media.ensureMediaTracks,
  });

  const screenShare = useMeetingScreenShare({
    ...opts,
    peersRef: peers.peersRef,
    ensureLocalMedia: media.ensureLocalMedia,
  });

  return {
    remoteStreams: streams.remoteStreams,
    setRemoteStreams: streams.setRemoteStreams,
    remoteStreamsRef: streams.remoteStreamsRef,
    upsertRemoteStream: streams.upsertRemoteStream,
    removeRemoteStream: streams.removeRemoteStream,
    peersRef: peers.peersRef,
    politeRef: peers.politeRef,
    makingOfferRef: peers.makingOfferRef,
    iceQueueRef: peers.iceQueueRef,
    createPeerConnection: peers.createPeerConnection,
    closePeer: peers.closePeer,
    createAndSendOffer: peers.createAndSendOffer,
    addTracksToAllPeers: peers.addTracksToAllPeers,
    ensureLocalMedia: media.ensureLocalMedia,
    ensureMediaTracks: media.ensureMediaTracks,
    startAndJoinMeetingRtc: join.startAndJoinMeetingRtc,
    stopMeetingRtc: join.stopMeetingRtc,
    startJoinRef: join.startJoinRef,
    handleToggleAudio: toggleAudio.handleToggleAudio,
    handleToggleVideo: toggleVideo.handleToggleVideo,
    handleToggleScreenShare: screenShare.handleToggleScreenShare,
    peerMetaRef,
  };
}
