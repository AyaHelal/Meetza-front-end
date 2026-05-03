import { useState, useEffect, useRef } from "react";
import { fetchLastMessagePreview } from "../services/chatsPanelService";

export function useChatsPanelMessagePreviews(axiosInstance, groupChats) {
  const [messagePreviews, setMessagePreviews] = useState({});
  const fetchingPreviewsRef = useRef(false);
  const fetchedPreviewsRef = useRef(new Set());

  useEffect(() => {
    if (!groupChats?.length || fetchingPreviewsRef.current) return;

    const groupsToFetch = groupChats.filter((chat) => {
      const chatIdStr = String(chat.id);
      const hasDate = chat.last_message_at || chat.date || chat.last_message_time;
      const hasMessage = chat.last_message?.trim();
      const hasSubject =
        chat.subject?.trim() &&
        chat.subject !== "No messages yet" &&
        chat.subject !== "Media attachment";
      const alreadyFetched = fetchedPreviewsRef.current.has(chatIdStr);
      return hasDate && !hasMessage && !hasSubject && !alreadyFetched;
    });

    if (groupsToFetch.length === 0) return;

    fetchingPreviewsRef.current = true;

    (async () => {
      try {
        const results = await Promise.allSettled(
          groupsToFetch.map((chat) => fetchLastMessagePreview(axiosInstance, chat))
        );
        const newPreviews = {};
        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            const chatIdStr = String(result.value.id);
            fetchedPreviewsRef.current.add(chatIdStr);
            if (result.value.preview) newPreviews[chatIdStr] = result.value.preview;
          }
        });
        if (Object.keys(newPreviews).length > 0) {
          setMessagePreviews((prev) => ({ ...prev, ...newPreviews }));
        }
      } finally {
        fetchingPreviewsRef.current = false;
      }
    })();
  }, [axiosInstance, groupChats]);

  return messagePreviews;
}
