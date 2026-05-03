import { useRef, useCallback, useEffect } from "react";
import * as meetingRtcService from "../services/meetingRtcService";

/**
 * Peer connections refs + create/close/offer. All refs live here.
 * @param {Object} opts
 * @param {import("socket.io-client").Socket | null} opts.socket
 * @param {{ current: string | null }} opts.meetingIdRef
 * @param {{ current: MediaStream | null }} opts.localStreamRef
 * @param {() => void} opts.setLocalStream
 * @param {(id: string, stream: MediaStream, isScreen: boolean) => void} opts.upsertRemoteStream
 * @param {(id: string, screenOnly?: boolean) => void} opts.removeRemoteStream
 * @param {(id: string, pc: RTCPeerConnection) => void} opts.registerPeerConnection
 * @param {(id: string) => void} opts.unregisterPeerConnection
 * @param {(fn: (prev: Object) => Object) => void} opts.setMediaStateMap
 * @param {(fn: (prev: Array) => Array) => void} opts.setRemoteStreams
 * @param {() => Promise<MediaStream>} opts.ensureLocalMedia
 */
export function useMeetingPeers(opts) {
  const {
    socket,
    meetingIdRef,
    localStreamRef,
    setLocalStream,
    upsertRemoteStream,
    removeRemoteStream,
    registerPeerConnection,
    unregisterPeerConnection,
    setMediaStateMap,
    setRemoteStreams,
    ensureLocalMedia,
  } = opts;

  const peersRef = useRef(new Map());
  const politeRef = useRef(new Map());
  const makingOfferRef = useRef(false);
  const iceQueueRef = useRef(new Map());
  const createAndSendOfferRef = useRef(null);

  const createAndSendOffer = useCallback(
    (targetSocketId) =>
      meetingRtcService.createAndSendOffer(
        {
          peersRef,
          localStreamRef,
          makingOfferRef,
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

  const closePeer = useCallback(
    (peerSocketId) => {
      meetingRtcService.closePeer(peerSocketId, peersRef, unregisterPeerConnection, removeRemoteStream);
    },
    [unregisterPeerConnection, removeRemoteStream]
  );

  const createPeerConnection = useCallback(
    (peerSocketId) =>
      meetingRtcService.createPeerConnection(peerSocketId, {
        socket,
        meetingIdRef,
        localStreamRef,
        politeRef,
        createAndSendOfferRef,
        upsertRemoteStream,
        registerPeerConnection,
        setMediaStateMap,
        setRemoteStreams,
      }),
    [socket, upsertRemoteStream, registerPeerConnection, setMediaStateMap, setRemoteStreams]
  );

  const addTracksToAllPeers = useCallback(() => {
    meetingRtcService.addTracksToAllPeers({
      localStreamRef,
      peersRef,
      makingOfferRef,
      meetingIdRef,
      socket,
    });
  }, [socket]);

  return {
    peersRef,
    politeRef,
    makingOfferRef,
    iceQueueRef,
    createAndSendOfferRef,
    createPeerConnection,
    closePeer,
    createAndSendOffer,
    addTracksToAllPeers,
  };
}
