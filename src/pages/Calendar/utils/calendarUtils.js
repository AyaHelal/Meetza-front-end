const pad = (n) => String(n).padStart(2, "0");

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Get Monday–Sunday dates for the week containing the given date.
 */
export function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    week.push(dayDate);
  }
  return week;
}

/**
 * Filter meetings to those that fall within the given day/week/month (client-side).
 * Use when the API returns all meetings without server-side filtering.
 */
export function filterMeetingsByView(meetings, viewMode, currentDate) {
  if (!Array.isArray(meetings)) return [];
  const getStart = (m) => {
    const raw = m.start_time ?? m.startTime ?? m.start;
    return raw ? new Date(raw) : null;
  };
  const d = new Date(currentDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const date = d.getDate();

  if (viewMode === "day") {
    return meetings.filter((m) => {
      const start = getStart(m);
      if (!start) return false;
      return start.getFullYear() === year && start.getMonth() === month && start.getDate() === date;
    });
  }

  if (viewMode === "week") {
    const weekDates = getWeekDates(d);
    const start = new Date(weekDates[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekDates[6]);
    end.setHours(23, 59, 59, 999);
    return meetings.filter((m) => {
      const s = getStart(m);
      if (!s) return false;
      const t = s.getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }

  if (viewMode === "month") {
    return meetings.filter((m) => {
      const start = getStart(m);
      if (!start) return false;
      return start.getFullYear() === year && start.getMonth() === month;
    });
  }

  return meetings;
}

/**
 * Normalize to local date (midnight) to avoid timezone/UTC losing a day.
 */
function toLocalDateOnly(d) {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get an array of Date objects from start to end (inclusive).
 * Uses calendar-day logic so no days are lost to timezone/UTC.
 */
export function getDatesInRange(startDate, endDate) {
  const start = toLocalDateOnly(startDate);
  const end = toLocalDateOnly(endDate);
  if (start.getTime() > end.getTime()) return [];
  const out = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endTime = end.getTime();
  while (cur.getTime() <= endTime) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Filter meetings to those within a date range.
 */
export function filterMeetingsByDateRange(meetings, rangeStart, rangeEnd) {
  if (!Array.isArray(meetings) || !rangeStart || !rangeEnd) return meetings;
  const getStart = (m) => {
    const raw = m.start_time ?? m.startTime ?? m.start;
    return raw ? new Date(raw) : null;
  };
  const start = rangeStart instanceof Date ? new Date(rangeStart) : new Date(rangeStart);
  const end = rangeEnd instanceof Date ? new Date(rangeEnd) : new Date(rangeEnd);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  const t0 = start.getTime();
  const t1 = end.getTime();
  return meetings.filter((m) => {
    const s = getStart(m);
    if (!s) return false;
    return s.getTime() >= t0 && s.getTime() <= t1;
  });
}

/**
 * Build query params for GET /meetings or GET /meeting.
 * - Day:   { day: "YYYY-MM-DD" }
 * - Week:  { week: "YYYY-MM-DD" }
 * - Month: { month: "YYYY-MM" }
 * - Range: { start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD" }
 */
export function buildMeetingsParams(viewMode, currentDate, rangeStart = null, rangeEnd = null) {
  const d = new Date(currentDate);
  const toYMD = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  if (viewMode === "range" && rangeStart && rangeEnd) {
    const s = rangeStart instanceof Date ? rangeStart : new Date(rangeStart);
    const e = rangeEnd instanceof Date ? rangeEnd : new Date(rangeEnd);
    return { start_date: toYMD(s), end_date: toYMD(e) };
  }

  if (viewMode === "day") {
    return { day: toYMD(d) };
  }

  if (viewMode === "week") {
    const weekDates = getWeekDates(d);
    const monday = weekDates[0];
    return { week: toYMD(monday) };
  }

  if (viewMode === "month") {
    return { month: `${d.getFullYear()}-${pad(d.getMonth() + 1)}` };
  }

  return {};
}

/**
 * Resolve group name from meeting and optional map of group_id -> name.
 * @param {object} m - meeting from API
 * @param {Record<string, string>|null} [groupsMap] - optional { [group_id]: name }
 */
function getMeetingGroupName(m, groupsMap) {
  const fromMeeting =
    m.group_name ??
    m.groupName ??
    m.course ??
    m.group?.name ??
    m.group_title ??
    (typeof m.group === "string" ? m.group : null);
  if (fromMeeting) return fromMeeting;
  const gid = m.group_id ?? m.groupId ?? m.group?.id;
  if (groupsMap && gid != null) return groupsMap[String(gid)] ?? groupsMap[gid] ?? null;
  return null;
}

/**
 * Map meetings to week/day grid events.
 * Each event has: { id, dayIndex, start, end, title, description, groupName, imageUrl, lockType, _meeting }
 * @param {Array} meetings
 * @param {Array} weekDates
 * @param {Record<string, string>|null} [groupsMap] - optional { [group_id]: name } to resolve group name from group_id
 */
export function buildWeekEvents(meetings, weekDates, groupsMap = null) {
  if (!Array.isArray(meetings) || !Array.isArray(weekDates) || weekDates.length === 0) return [];

  const baseImage = "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";

  const isSameCalendarDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return meetings
    .map((m) => {
      const startRaw = m.start_time ?? m.startTime ?? m.start;
      const endRaw = m.end_time ?? m.endTime ?? m.end;
      const start = startRaw ? toDate(startRaw) : new Date();
      const end = endRaw ? toDate(endRaw) : new Date(start.getTime() + 60 * 60 * 1000);
      const dayIndex = weekDates.findIndex((wd) => isSameCalendarDay(wd, start));
      return { m, start, end, dayIndex };
    })
    .filter(({ dayIndex }) => dayIndex >= 0)
    .map(({ m, start, end, dayIndex }) => {
      const poster =
        m.poster_url ??
        m.posterUrl ??
        m.poster ??
        m.image_url ??
        m.imageUrl ??
        null;
      const posterUrl = typeof poster === "string" && poster.trim() ? poster.trim() : null;

      return {
        id: m.id ?? m.meeting_id ?? `m-${start.getTime()}`,
        dayIndex,
        start,
        end,
        title: m.title ?? "Meeting",
        description: m.description ?? "",
        groupName: getMeetingGroupName(m, groupsMap) ?? "—",
        imageUrl: posterUrl || baseImage,
        lockType: m.recording ? "red" : "blue",
        _meeting: m,
      };
    });
}

/**
 * Build a month grid matrix (array of weeks, each week = array of 7 Date cells).
 * Starts on Monday and covers all days that intersect the given month.
 */
export function getMonthMatrix(currentDate) {
  const d = new Date(currentDate);
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const firstDay = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon, ...
  const offset = (firstDay === 0 ? -6 : 1) - firstDay; // move to Monday
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() + offset);

  const weeks = [];
  // 6 weeks is enough to cover any month
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + w * 7 + i);
      week.push(cellDate);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Format month range for nav: "March 2026" (same month) or "February – March 2026" (span).
 */
export function formatMonthRange(startDate, endDate) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) return formatMonthYear(start);
  const sameYear = start.getFullYear() === end.getFullYear();
  const part = (d, withYear) =>
    d.toLocaleDateString("en-GB", {
      month: "long",
      ...(withYear ? { year: "numeric" } : {}),
    });
  if (sameYear) return `${part(start, false)} – ${part(end, false)} ${end.getFullYear()}`;
  return `${part(start, true)} – ${part(end, true)}`;
}

export function formatDayShort(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase().slice(0, 3);
}

export function formatDayNum(date) {
  return date.getDate();
}

export function formatShortDate(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Format a date range for display: "21 February - 6 March 2026" (same year)
 * or "21 December 2025 - 6 January 2026" (different years).
 */
export function formatRangeDisplay(startDate, endDate) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const part = (d, withYear) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      ...(withYear ? { year: "numeric" } : {}),
    });
  if (sameYear) {
    return `${part(start, false)} – ${part(end, false)} ${end.getFullYear()}`;
  }
  return `${part(start, true)} – ${part(end, true)}`;
}

export function formatTimeRange(start, end) {
  const fmt = (d) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${fmt(start)} to ${fmt(end)}`;
}

export function formatDateForOverlay(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Short time span for narrow calendar cards (mobile week columns). */
export function formatCompactTimeRange(start, end) {
  const fmt = (d) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${fmt(start)} – ${fmt(end)}`;
}
