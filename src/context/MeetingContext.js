import { createContext, useContext, useState, useCallback } from "react";

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

  const setParticipants = useCallback((updater) => {
    setParticipantsState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  const setMeetingId = useCallback((id) => {
    setMeetingIdState(id);
  }, []);

  const value = {
    participants,
    setParticipants,
    meetingId,
    setMeetingId,
    hasJoined,
    setHasJoined,
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
};
