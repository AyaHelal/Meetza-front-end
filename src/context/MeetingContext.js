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
  const [localParticipantAudioMuted, setLocalParticipantAudioMutedState] = useState({});
  /** مشارك = مقفول/مفتوح مايك من عنده (من updateMediaState أو adminMute) - للعرض في Participants */
  const [mediaStateMap, setMediaStateMapState] = useState({});
  const setMediaStateMap = useCallback((updater) => {
    setMediaStateMapState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

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

  const setLocalParticipantAudioMuted = useCallback((updater) => {
    setLocalParticipantAudioMutedState((prev) => (typeof updater === "function" ? updater(prev) : updater));
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
      const msgTs = message.timestamp || 0;
      const isFromServer = !message.id || !String(message.id).startsWith("opt-");

      // When server echo arrives: replace our optimistic message so the comment appears only once with backend name
      // Match by text + time only (ignore senderId so it works even if user tampered sessionStorage)
      if (isFromServer) {
        const optIndex = prev.findIndex(
          (m) =>
            String(m.id || "").startsWith("opt-") &&
            m.text === message.text &&
            Math.abs((m.timestamp || 0) - msgTs) < 4000
        );
        if (optIndex !== -1) {
          const newMessages = [...prev];
          newMessages[optIndex] = message;
          const currentMeetingId = meetingId;
          if (currentMeetingId) {
            try {
              localStorage.setItem(`meeting_chat_${currentMeetingId}`, JSON.stringify(newMessages));
            } catch (e) {
              console.warn("Failed to save chat messages to localStorage:", e);
            }
          }
          return newMessages;
        }
      }

      // Exact ID match
      if (prev.some((msg) => msg.id === message.id)) return prev;
      // Same text, same sender, within 2 seconds (dedupe)
      const duplicate = prev.some(
        (msg) =>
          msg.text === message.text &&
          msg.senderId &&
          message.senderId &&
          String(msg.senderId) === String(message.senderId) &&
          Math.abs((msg.timestamp || 0) - msgTs) < 2000
      );
      if (duplicate) return prev;

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
    localParticipantAudioMuted,
    setLocalParticipantAudioMuted,
    mediaStateMap,
    setMediaStateMap,
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
};
