import { createContext, useContext, useState, useCallback, useEffect } from "react";

const MeetingContext = createContext(null);

export const useMeetingContext = () => {
  const ctx = useContext(MeetingContext);
  return ctx;
};

/**
 * MeetingProvider wraps MeetingRoom and MeetingRightSidebar.
 * participants: socket-driven list, updated on participantJoined / participantLeft.
 * Format: [{ socketId, member_id, member_name, member_photo, member_email }]
 */
export const MeetingProvider = ({ children }) => {
  const [participants, setParticipantsState] = useState([]);
  const [meetingId, setMeetingIdState] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);

  // Load chat messages from localStorage on mount
  const loadChatMessagesFromStorage = useCallback((mid) => {
    if (!mid) return [];
    try {
      const stored = localStorage.getItem(`meeting_chat_${mid}`);
      if (stored) {
        const messages = JSON.parse(stored);
        // Filter out messages older than 24 hours (optional cleanup)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return messages.filter(msg => (msg.timestamp || 0) > oneDayAgo);
      }
    } catch (error) {
      console.warn("Failed to load chat messages from localStorage:", error);
    }
    return [];
  }, []);

  const [chatMessages, setChatMessagesState] = useState(() => {
    // Initialize with empty array, will load when meetingId is set
    return [];
  });

  const setParticipants = useCallback((updater) => {
    setParticipantsState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  const setMeetingId = useCallback((id) => {
    setMeetingIdState(id);
    // Messages will be loaded via useEffect when meetingId changes
  }, []);

  // Load messages when meetingId is set (including on initial mount)
  useEffect(() => {
    if (meetingId) {
      const storedMessages = loadChatMessagesFromStorage(meetingId);
      if (storedMessages.length > 0) {
        setChatMessagesState(storedMessages);
        console.log(`📥 Loaded ${storedMessages.length} messages from localStorage for meeting ${meetingId}`);
      } else {
        setChatMessagesState([]);
      }
    } else {
      setChatMessagesState([]);
    }
  }, [meetingId, loadChatMessagesFromStorage]);

  const addChatMessage = useCallback((message) => {
    setChatMessagesState((prev) => {
      // Check if message already exists
      const exists = prev.some(msg => {
        // Exact ID match
        if (msg.id === message.id) {
          console.log("⚠️ Duplicate message detected by ID:", message.id);
          return true;
        }
        // Same text, same sender, within 2 seconds (for optimistic updates)
        if (msg.text === message.text &&
            msg.senderName === message.senderName &&
            msg.senderId && message.senderId &&
            String(msg.senderId) === String(message.senderId) &&
            Math.abs((msg.timestamp || 0) - (message.timestamp || 0)) < 2000) {
          console.log("⚠️ Duplicate message detected by content:", {
            text: message.text,
            sender: message.senderName,
            timeDiff: Math.abs((msg.timestamp || 0) - (message.timestamp || 0))
          });
          return true;
        }
        return false;
      });
      if (exists) {
        console.log("⚠️ Message already exists, skipping");
        return prev;
      }
      const newMessages = [...prev, message];

      // Persist to localStorage
      const currentMeetingId = meetingId;
      if (currentMeetingId) {
        try {
          localStorage.setItem(`meeting_chat_${currentMeetingId}`, JSON.stringify(newMessages));
        } catch (e) {
          console.warn("Failed to save chat messages to localStorage:", e);
        }
      }

      console.log("✅ Adding new message to chat, total messages:", newMessages.length);
      return newMessages;
    });
  }, [meetingId]);

  const value = {
    participants,
    setParticipants,
    meetingId,
    setMeetingId,
    hasJoined,
    setHasJoined,
    chatMessages,
    addChatMessage,
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
};
