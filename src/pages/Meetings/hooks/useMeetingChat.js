import { useState, useCallback } from "react";
import * as meetingSocketService from "../services/meetingSocketService";

/**
 * Meeting chat: comment state + handleSendComment.
 * Returns commentText, setCommentText, showCommentInput, setShowCommentInput, handleSendComment.
 */
export function useMeetingChat(opts) {
  const {
    socket,
    isConnected,
    meetingIdRef,
    meetingId,
    addChatMessage,
    user,
  } = opts;

  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleSendComment = useCallback(() => {
    const currentMeetingId = meetingIdRef?.current || meetingId;
    if (!socket || !isConnected || !currentMeetingId) {
      console.warn("Cannot send comment - socket, connection, or meetingId missing");
      return;
    }
    const trimmedText = (typeof commentText === "string" ? commentText : "").trim();
    if (!trimmedText) {
      console.warn("Cannot send empty comment");
      return;
    }
    const payload = {
      meetingId: String(currentMeetingId),
      text: trimmedText,
    };
    const senderId = user?.id ?? user?.member_id ?? null;
    const optimisticMessage = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: trimmedText,
      senderName: "You",
      senderId,
      senderPhoto: null,
      timestamp: Date.now(),
      isOwn: true,
    };
    addChatMessage(optimisticMessage);
    const messageText = trimmedText;
    setCommentText("");
    setShowCommentInput(false);
    meetingSocketService.sendMeetingChatMessage(socket, payload, (ack) => {
      if (ack && !ack.ok) {
        console.error("Failed to send comment:", ack);
        setCommentText(messageText);
      }
    });
  }, [socket, isConnected, meetingIdRef, meetingId, commentText, addChatMessage, user]);

  return {
    commentText,
    setCommentText,
    showCommentInput,
    setShowCommentInput,
    handleSendComment,
  };
}
