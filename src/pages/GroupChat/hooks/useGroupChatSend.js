import { useState, useCallback } from "react";
import { buildSendMessageFormData, getGroupInfo, sendMessageRest } from "../services/groupChatService";
import { formatMessage, getMediaLabel, deriveMediaCategory } from "../utils/groupChatFormatters";
import { smartToast } from "../../../API/toastManager";

/**
 * Send message handler: optimistic update, then socket or REST.
 */
export function useGroupChatSend(
  api,
  selectedChat,
  groupChats,
  user,
  setMessages,
  setGroupChats,
  setGroupInfo,
  socket,
  isConnected,
  socketSendMessage
) {
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSendMessage = useCallback(
    async ({ text, file, mediaCategory, parentMessageId, parentPreview }) => {
      if (selectedChat === null) return false;
      const groupId = groupChats[selectedChat]?.id;
      if (!groupId) return false;

      const trimmedText = text?.trim() || "";
      if (!trimmedText && !file) return false;

      const tempId = `temp-${Date.now()}`;
      let localMediaUrl = null;
      let originalName = null;
      const normalizedType = file ? deriveMediaCategory(file, mediaCategory) : null;
      const finalMediaType =
        mediaCategory === "voice_note"
          ? "voice_note"
          : file?.type?.startsWith("video/") && mediaCategory === "voice_note"
            ? "voice_note"
            : normalizedType || "document";

      const optimisticMessage = {
        id: tempId,
        sender: user?.name || "You",
        initials: user?.name?.charAt(0)?.toUpperCase() || "ME",
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        text: trimmedText,
        message: trimmedText,
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        created_at: new Date().toISOString(),
        senderPhoto: user?.photo || null,
        senderEmail: user?.email || null,
        media: [],
        ...(parentMessageId
          ? {
              parent_message_id: parentMessageId,
              parent_message:
                parentPreview && (parentPreview.sender || parentPreview.text)
                  ? {
                      id: parentMessageId,
                      sender: parentPreview.sender || "User",
                      text: (parentPreview.text || "").slice(0, 240),
                    }
                  : { id: parentMessageId, sender: "", text: "" },
            }
          : {}),
      };

      if (file) {
        localMediaUrl = URL.createObjectURL(file);
        originalName = file.name || "attachment";
        optimisticMessage.media = [
          {
            id: `${tempId}-media`,
            media_url: localMediaUrl,
            media_type: finalMediaType,
            isLocal: true,
            file_name: originalName,
          },
        ];
      }

      setMessages((prev) => [...prev, optimisticMessage]);
      const previewLabel =
        trimmedText || (file ? getMediaLabel(finalMediaType, originalName) : "");
      setGroupChats((prev) =>
        prev.map((chat, index) =>
          index === selectedChat
            ? { ...chat, subject: previewLabel || chat.subject }
            : chat
        )
      );

      const formData = buildSendMessageFormData({
        messageText: trimmedText,
        file,
        mediaCategory,
        normalizedType,
        parentMessageId,
      });

      setIsSendingMessage(true);
      const containsLink = trimmedText && /https?:\/\/[^\s<>,;]+/i.test(trimmedText);

      const refreshGroupInfo = async () => {
        const info = await getGroupInfo(api, groupId);
        if (info) setGroupInfo(info);
      };

      const sendViaRestAPI = async () => {
        try {
          const data = await sendMessageRest(api, groupId, formData);
          if (data) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === tempId ? formatMessage(data) : msg))
            );
            if ((file && finalMediaType !== "voice_note") || containsLink) {
              await refreshGroupInfo();
            }
            if (localMediaUrl) URL.revokeObjectURL(localMediaUrl);
            setIsSendingMessage(false);
            return true;
          }
          throw new Error("Failed to send message");
        } catch (err) {
          console.error("REST API failed to send message:", err);
          smartToast.error(err?.response?.data?.message || "Failed to send message");
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
          if (localMediaUrl) URL.revokeObjectURL(localMediaUrl);
          setIsSendingMessage(false);
          return false;
        }
      };

      try {
        if (file) return await sendViaRestAPI();
        if (socket && isConnected) {
          return new Promise((resolve) => {
            const socketOptions =
              parentMessageId != null && parentMessageId !== ""
                ? { parentMessageId }
                : {};
            socketSendMessage(groupId, trimmedText, async (ack) => {
              if (ack?.ok && ack.data) {
                setMessages((prev) => {
                  const idx = prev.findIndex((msg) => msg.id === ack.data.id);
                  if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = formatMessage(ack.data);
                    return updated;
                  }
                  return prev.map((msg) =>
                    msg.id === tempId ? formatMessage(ack.data) : msg
                  );
                });
                if (containsLink) await refreshGroupInfo();
                if (localMediaUrl) URL.revokeObjectURL(localMediaUrl);
                setIsSendingMessage(false);
                resolve(true);
              } else {
                sendViaRestAPI().then(resolve);
              }
            }, socketOptions);
          });
        }
        return await sendViaRestAPI();
      } catch (err) {
        console.error("Error sending message:", err);
        smartToast.error(err?.response?.data?.message || "Failed to send message");
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        if (localMediaUrl) URL.revokeObjectURL(localMediaUrl);
        setIsSendingMessage(false);
        return false;
      }
    },
    [
      api,
      selectedChat,
      groupChats,
      user,
      setMessages,
      setGroupChats,
      setGroupInfo,
      socket,
      isConnected,
      socketSendMessage,
    ]
  );

  return { handleSendMessage, isSendingMessage };
}
