import { useState, useCallback, useEffect } from "react";
import { getReplySnippetForMessage } from "../utils/messageItemUtils";

export const useReply = (groupId, onSendMessage) => {
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    setReplyTo(null);
  }, [groupId]);

  const handleReplyToMessage = useCallback((message) => {
    if (!message?.id || String(message.id).startsWith("temp-") || message.is_deleted) return;
    setReplyTo({
      id: message.id,
      sender: message.sender || "User",
      snippet: getReplySnippetForMessage(message) || "Message",
    });
  }, []);

  const handleSendWithReply = useCallback(
    async (payload) => {
      const ok = await onSendMessage({
        ...payload,
        ...(replyTo?.id
          ? {
              parentMessageId: replyTo.id,
              parentPreview: { sender: replyTo.sender, text: replyTo.snippet },
            }
          : {}),
      });
      if (ok) setReplyTo(null);
      return ok;
    },
    [onSendMessage, replyTo]
  );

  const handleCancelReply = useCallback(() => setReplyTo(null), []);

  return {
    replyTo,
    handleReplyToMessage,
    handleSendWithReply,
    handleCancelReply,
  };
};
