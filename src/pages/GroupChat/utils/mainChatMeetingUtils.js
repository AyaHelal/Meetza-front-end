/**
 * Meeting helpers for MainChat – pure functions, no API.
 */

/**
 * A meeting is "currently active" if status is not Completed/Cancelled
 * and current time is between start_time and end_time.
 * @param {object} meeting
 * @returns {boolean}
 */
export function isMeetingCurrentlyActive(meeting) {
  if (!meeting) return false;

  const status = (meeting.status || "").toString().trim().toLowerCase();
  if (["completed", "cancelled"].includes(status)) return false;

  const startRaw = meeting.start_time;
  const endRaw = meeting.end_time;
  if (!startRaw || !endRaw) return false;

  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  const now = new Date();
  return now >= start && now < end;
}

/**
 * Get meeting id from meeting object (handles various backend shapes).
 * @param {object} meeting
 * @returns {string|null}
 */
export function getMeetingId(meeting) {
  if (!meeting) return null;
  return (
    meeting.id ??
    meeting.meeting_id ??
    meeting.meetingId ??
    meeting.meeting?.id ??
    null
  );
}
