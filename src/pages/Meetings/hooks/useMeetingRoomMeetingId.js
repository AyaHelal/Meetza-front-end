import { useEffect, useMemo } from "react";

/**
 * Resolves meetingId from location state, query string, or sessionStorage.
 * Syncs to meetingIdRef and context.
 */
export function useMeetingRoomMeetingId({
  location,
  searchParams,
  meetingIdRef,
  setMeetingId,
  setMediaContextMeetingId,
}) {
  const meetingId = useMemo(() => {
    const fromLocation =
      location?.state?.meetingId || searchParams.get("meetingId") || null;
    if (fromLocation != null && String(fromLocation).trim() !== "") return String(fromLocation);
    try {
      const stored = sessionStorage.getItem("activeMeetingId");
      return stored != null && String(stored).trim() !== "" ? String(stored) : null;
    } catch {
      return null;
    }
  }, [location?.state?.meetingId, searchParams]);

  useEffect(() => {
    meetingIdRef.current = meetingId;
    setMeetingId(meetingId);
    setMediaContextMeetingId(meetingId);
  }, [meetingId, setMeetingId, setMediaContextMeetingId, meetingIdRef]);

  return meetingId;
}
