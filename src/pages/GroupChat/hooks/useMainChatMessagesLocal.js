import { useState, useEffect } from "react";
import { formatMessages, sortMessagesChronologically } from "../utils/mainChatMessageUtils";

/**
 * Local messages state synced with initialMessages (from parent).
 */
export function useMainChatMessagesLocal(initialMessages) {
  const [messages, setMessages] = useState(() => {
    if (!Array.isArray(initialMessages)) return [];
    return sortMessagesChronologically(formatMessages(initialMessages));
  });

  useEffect(() => {
    if (!initialMessages || !Array.isArray(initialMessages)) return;
    setMessages(sortMessagesChronologically(formatMessages(initialMessages)));
  }, [initialMessages]);

  return [messages, setMessages];
}
