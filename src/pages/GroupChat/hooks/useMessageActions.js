import { useCallback } from "react";
import { smartToast } from "../../../API/toastManager";
import { deleteMessage, updateMessage } from "../../../API/auth";
import { reactToMessage } from "../services/groupChatService";
import { formatMessages } from "../utils/mainChatMessageUtils";
import {
  optimisticReplaceMyReaction,
  reactionsFromRawPayload,
  buildMemberIdLookup,
  buildMemberRecordLookup,
  mergeUserIntoMemberLookup,
  mergeUserIntoMemberRecordLookup,
} from "../utils/groupChatFormatters";

export const useMessageActions = ({
  api,
  groupId,
  messages,
  setMessages,
  socket,
  isConnected,
  socketReactToMessage,
  groupMembers,
  onMessageEdited,
  onMessageDeleted,
}) => {
  const handleDeleteMessage = async (messageId) => {
    if (!groupId) {
      smartToast.error("Group ID is missing");
      return;
    }
    try {
      await deleteMessage(groupId, messageId);
      setMessages((prev) => 
        prev.map((msg) => (msg.id === messageId ? { ...msg, is_deleted: true } : msg))
      );
      if (onMessageDeleted) onMessageDeleted(messageId);
      smartToast.success("Message deleted successfully");
    } catch (error) {
      smartToast.error("Failed to delete message");
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!groupId || !newText?.trim()) return;
    const trimmedText = newText.trim();
    try {
      const response = await updateMessage(groupId, messageId, trimmedText);
      let updatedMessage = (response?.data != null ? response.data : response) ?? null;
      if (!updatedMessage?.id) throw new Error("Invalid response");
      
      const originalMessage = messages.find((msg) => msg.id === messageId);
      const messageWithNewText = {
        ...originalMessage,
        ...updatedMessage,
        message: updatedMessage.message ?? updatedMessage.text ?? trimmedText,
        text: updatedMessage.text ?? updatedMessage.message ?? trimmedText,
      };
      
      const formattedUpdated = formatMessages([messageWithNewText])[0];
      setMessages((prev) => 
        prev.map((msg) => (msg.id === messageId ? formattedUpdated : msg))
      );
      smartToast.success("Message updated successfully");
      if (onMessageEdited) onMessageEdited(messageId, trimmedText);
    } catch (error) {
      smartToast.error("Failed to edit message");
    }
  };

  const handleReactToMessage = useCallback(
    async (messageId, emoji) => {
      if (!groupId || !messageId || !emoji?.trim()) return;
      const trimmedEmoji = emoji.trim();

      const membersArr = Array.isArray(groupMembers) ? groupMembers : [];
      const baseMemberLookup = buildMemberIdLookup(membersArr);
      const baseMemberRecordLookup = buildMemberRecordLookup(membersArr);

      if (socket && isConnected && socketReactToMessage) {
        const socketOk = await new Promise((resolve) => {
          socketReactToMessage(groupId, messageId, trimmedEmoji, (ack) => {
            if (ack?.ok && ack.data?.reactions !== undefined) {
              const lookup = mergeUserIntoMemberLookup(baseMemberLookup, ack.data?.user);
              const recordLookup = mergeUserIntoMemberRecordLookup(baseMemberRecordLookup, ack.data?.user);
              setMessages((prev) =>
                prev.map((msg) =>
                  String(msg.id) !== String(messageId)
                    ? msg
                    : {
                        ...msg,
                        reactions: reactionsFromRawPayload(
                          { reactions: ack.data.reactions },
                          lookup,
                          recordLookup
                        ),
                      }
                )
              );
            }
            resolve(Boolean(ack?.ok));
          });
        });
        if (socketOk) return;
      }

      try {
        const raw = await reactToMessage(api, groupId, messageId, { emoji: trimmedEmoji });
        const data = raw?.data !== undefined ? raw.data : raw;
        const lookupAfterRest = mergeUserIntoMemberLookup(baseMemberLookup, data?.user);
        const recordLookupAfterRest = mergeUserIntoMemberRecordLookup(baseMemberRecordLookup, data?.user);
        
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId) return msg;

            const nextReactions = reactionsFromRawPayload(
              data && typeof data === "object"
                ? data.reactions != null
                  ? { reactions: data.reactions }
                  : data
                : {},
              lookupAfterRest,
              recordLookupAfterRest
            );

            return formatMessages([
              {
                ...msg,
                reactions: optimisticReplaceMyReaction(nextReactions.length > 0 ? nextReactions : msg.reactions, trimmedEmoji),
              },
            ])[0];
          })
        );
      } catch (error) {
        smartToast.error(error?.response?.data?.message || "Failed to send reaction");
      }
    },
    [groupId, setMessages, socket, isConnected, socketReactToMessage, groupMembers, api]
  );

  return {
    handleDeleteMessage,
    handleEditMessage,
    handleReactToMessage,
  };
};
