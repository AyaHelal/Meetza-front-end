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
    if (fromLocation) return fromLocation;
    try {
      return sessionStorage.getItem("activeMeetingId") || null;
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
