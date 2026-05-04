/**
 * Meeting socket service – static helpers for meeting-related socket events.
 */
import * as socketService from "../../../services/socketService";

export const MEETING_EVENTS = {
  JOIN: "joinMeetingRoom",
  LEAVE: "leaveMeetingRoom",
  PARTICIPANT_JOINED: "participantJoined",
  PARTICIPANT_LEFT: "participantLeft",
  WEBRTC_OFFER: "webrtcOffer",
  WEBRTC_ANSWER: "webrtcAnswer",
  WEBRTC_ICE_CANDIDATE: "webrtcIceCandidate",
  UPDATE_MEDIA_STATE: "updateMediaState",
  MEDIA_STATE_UPDATED: "mediaStateUpdated",
  /** Event name we emit to server (server listens for "raiseHand") */
  RAISE_HAND_EMIT: "raiseHand",
  /** Event name we receive from server when someone raises/lowers hand */
  HAND_RAISED: "handRaised",
  REACTION: "reaction",
  MEETING_REACTION: "meetingReaction",
  REACTION_RECEIVED: "reactionReceived",
  SCREEN_SHARE_STARTED: "screenShareStarted",
  SCREEN_SHARE_STOPPED: "screenShareStopped",
  MEETING_ENDED: "meetingEnded",
  MEETING_DELETED: "meetingDeleted",
  MEETING_CHAT_MESSAGE: "meetingChatMessage",
  /** Server → all clients in room: admin forced mute/unmute for targetSocketId (keeps UI + playback in sync for everyone). */
  PARTICIPANT_ADMIN_MUTE: "participantAdminMute",
  /** Alternate event names some backends use — see useMeetingRoomSocketListeners */
  PARTICIPANT_ADMIN_MUTE_ALT: "meetingParticipantAdminMuted",
  /** Server → room (except actor): admin muted/unmuted a participant by user id */
  PARTICIPANT_MUTED_BY_ADMIN: "participantMutedByAdmin",
  /** Server → target only: apply forced mic/cam state */
  ADMIN_MUTE_YOU: "adminMuteYou",
};

export function joinMeeting(socket, meetingId, callback) {
  return socketService.emit(socket, MEETING_EVENTS.JOIN, { meetingId }, callback);
}

export function leaveMeeting(socket, meetingId, callback) {
  return socketService.emit(socket, MEETING_EVENTS.LEAVE, { meetingId }, callback);
}

export function sendWebrtcOffer(socket, meetingId, toSocketId, sdp, callback) {
  return socketService.emit(socket, MEETING_EVENTS.WEBRTC_OFFER, { toSocketId, meetingId, sdp }, callback ?? (() => {}));
}

export function sendWebrtcAnswer(socket, meetingId, toSocketId, sdp, callback) {
  return socketService.emit(socket, MEETING_EVENTS.WEBRTC_ANSWER, { toSocketId, meetingId, sdp }, callback ?? (() => {}));
}

export function sendIceCandidate(socket, meetingId, toSocketId, candidate, callback) {
  return socketService.emit(socket, MEETING_EVENTS.WEBRTC_ICE_CANDIDATE, { toSocketId, meetingId, candidate }, callback ?? (() => {}));
}

export function updateMediaState(socket, meetingId, audioMuted, videoMuted) {
  return socketService.emit(socket, MEETING_EVENTS.UPDATE_MEDIA_STATE, { meetingId, audioMuted, videoMuted });
}

export function raiseHand(socket, meetingId, raised = true) {
  return socketService.emit(socket, MEETING_EVENTS.RAISE_HAND_EMIT, { meetingId, raised });
}

export function sendReaction(socket, meetingId, type = "like", callback) {
  return socketService.emit(socket, MEETING_EVENTS.REACTION, { meetingId, type }, callback);
}

export function sendReactionPayload(socket, payload, callback) {
  return socketService.emit(socket, MEETING_EVENTS.REACTION, payload, callback);
}

export function screenShareStarted(socket, meetingId, payload = {}) {
  return socketService.emit(socket, MEETING_EVENTS.SCREEN_SHARE_STARTED, { meetingId, ...payload });
}

export function screenShareStopped(socket, meetingId, payload = {}) {
  return socketService.emit(socket, MEETING_EVENTS.SCREEN_SHARE_STOPPED, { meetingId, ...payload });
}

export function meetingEnded(socket, meetingId, callback) {
  return socketService.emit(socket, MEETING_EVENTS.MEETING_ENDED, { meetingId }, callback);
}

export function sendMeetingChatMessage(socket, payload, callback) {
  return socketService.emit(socket, MEETING_EVENTS.MEETING_CHAT_MESSAGE, payload, callback);
}

export function onMeetingEvent(socket, eventName, handler) {
  socketService.on(socket, eventName, handler);
}

export function offMeetingEvent(socket, eventName, handler) {
  socketService.off(socket, eventName, handler);
}
