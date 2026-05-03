/**
 * Hook that returns meeting socket actions bound to current socket and meetingId ref.
 * Components call these instead of importing meetingSocketService and passing socket/id every time.
 */
import { useCallback } from "react";
import * as meetingSocketService from "../services/meetingSocketService";

/**
 * @param {import("socket.io-client").Socket | null} socket
 * @param {{ current: string | null }} meetingIdRef
 * @returns {{
 *   joinMeeting: (callback?: (ack: any) => void) => void,
 *   leaveMeeting: () => void,
 *   updateMediaState: (audioMuted: boolean, videoMuted: boolean) => void,
 *   sendWebrtcOffer: (toSocketId: string, sdp: RTCSessionDescriptionInit, callback?: () => void) => void,
 *   raiseHand: (raised: boolean) => void,
 *   sendReactionPayload: (payload: object, callback?: (ack: any) => void) => void,
 *   screenShareStarted: (payload?: { socketId?: string }) => void,
 *   screenShareStopped: (payload?: { socketId?: string }) => void,
 *   meetingEnded: (callback?: () => void) => void,
 *   sendMeetingChatMessage: (payload: object, callback?: (ack: any) => void) => void,
 * }}
 */
export function useMeetingActions(socket, meetingIdRef) {
  const mid = () => meetingIdRef?.current ?? null;

  const joinMeeting = useCallback(
    (callback) => {
      const id = mid();
      if (socket && id) meetingSocketService.joinMeeting(socket, id, callback);
    },
    [socket]
  );

  const leaveMeeting = useCallback(() => {
    const id = mid();
    if (socket && id) meetingSocketService.leaveMeeting(socket, id);
  }, [socket]);

  const updateMediaState = useCallback(
    (audioMuted, videoMuted) => {
      const id = mid();
      if (socket && id) meetingSocketService.updateMediaState(socket, id, audioMuted, videoMuted);
    },
    [socket]
  );

  const sendWebrtcOffer = useCallback(
    (toSocketId, sdp, callback) => {
      const id = mid();
      if (socket && id) meetingSocketService.sendWebrtcOffer(socket, id, toSocketId, sdp, callback ?? (() => {}));
    },
    [socket]
  );

  const raiseHand = useCallback(
    (raised) => {
      const id = mid();
      if (socket && id) meetingSocketService.raiseHand(socket, id, raised);
    },
    [socket]
  );

  const sendReactionPayload = useCallback(
    (payload, callback) => {
      if (socket) meetingSocketService.sendReactionPayload(socket, payload, callback);
    },
    [socket]
  );

  const screenShareStarted = useCallback(
    (payload = {}) => {
      const id = mid();
      if (socket && id) meetingSocketService.screenShareStarted(socket, id, payload);
    },
    [socket]
  );

  const screenShareStopped = useCallback(
    (payload = {}) => {
      const id = mid();
      if (socket && id) meetingSocketService.screenShareStopped(socket, id, payload);
    },
    [socket]
  );

  const meetingEnded = useCallback(
    (callback) => {
      const id = mid();
      if (socket && id) meetingSocketService.meetingEnded(socket, id, callback);
    },
    [socket]
  );

  const sendMeetingChatMessage = useCallback(
    (payload, callback) => {
      if (socket) meetingSocketService.sendMeetingChatMessage(socket, payload, callback);
    },
    [socket]
  );

  return {
    joinMeeting,
    leaveMeeting,
    updateMediaState,
    sendWebrtcOffer,
    raiseHand,
    sendReactionPayload,
    screenShareStarted,
    screenShareStopped,
    meetingEnded,
    sendMeetingChatMessage,
  };
}
