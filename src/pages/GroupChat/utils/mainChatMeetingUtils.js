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
 * Meeting is in the future (start_time > now).
 * @param {object} meeting
 * @returns {boolean}
 */
export function isMeetingInFuture(meeting) {
  if (!meeting?.start_time) return false;
  const start = new Date(meeting.start_time);
  return !Number.isNaN(start.getTime()) && start > new Date();
}

/**
 * Meeting has ended (end_time < now or status Completed/Cancelled).
 * @param {object} meeting
 * @returns {boolean}
 */
export function isMeetingCompleted(meeting) {
  if (!meeting) return false;
  const status = (meeting.status || "").toString().trim().toLowerCase();
  if (["completed", "cancelled"].includes(status)) return true;
  if (!meeting.end_time) return false;
  const end = new Date(meeting.end_time);
  return !Number.isNaN(end.getTime()) && end < new Date();
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

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatTimeForCalendar(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours < 12 ? "AM" : "PM";
  const h = hours % 12 || 12;
  const timeStr = `${h}:${minutes < 10 ? "0" + minutes : minutes}`;
  return { timeStr, period };
}

/**
 * Map API meeting to calendar event display shape (same as existing CalendarEvent).
 * @param {object} meeting - from GET meeting?group_id=...
 * @returns {object} { month, day, online, type, startTime, startPeriod, endTime, endPeriod, avatars, _meeting }
 */
export function meetingToCalendarEvent(meeting) {
  if (!meeting) return null;
  const startRaw = meeting.start_time;
  const endRaw = meeting.end_time;
  const start = startRaw ? new Date(startRaw) : new Date();
  const end = endRaw ? new Date(endRaw) : new Date();
  const month = MONTHS_SHORT[start.getMonth()] ?? "—";
  const day = String(start.getDate());
  const startF = formatTimeForCalendar(start);
  const endF = formatTimeForCalendar(end);
  return {
    month,
    day,
    online: "Online",
    type: meeting.title || "Group Meeting",
    startTime: startF.timeStr,
    startPeriod: startF.period,
    endTime: endF.timeStr,
    endPeriod: endF.period,
    avatars: [],
    _meeting: meeting,
  };
}
