import React, { useMemo } from "react";
import { getMonthMatrix, formatTimeRange } from "../utils/calendarUtils";

export default function CalendarMonthGrid({ currentDate, meetings, onMeetingRightClick }) {
  const matrix = useMemo(() => getMonthMatrix(currentDate), [currentDate]);
  const month = currentDate.getMonth();

  const meetingsByDay = useMemo(() => {
    if (!Array.isArray(meetings)) return {};
    const map = {};
    meetings.forEach((m) => {
      const raw = m.start_time ?? m.startTime ?? m.start;
      const start = raw ? new Date(raw) : null;
      if (!start) return;
      const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
      if (!map[key]) map[key] = [];
      const endRaw = m.end_time ?? m.endTime ?? m.end;
      const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 60 * 60 * 1000);
      map[key].push({ meeting: m, start, end });
    });
    return map;
  }, [meetings]);

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toSundayFirst = (week) => [week[6], week[0], week[1], week[2], week[3], week[4], week[5]];

  return (
    <div className="calendar-month-grid">
      <div className="calendar-month-grid-header">
        {weekDayLabels.map((label) => (
          <div key={label} className="calendar-month-grid-header-cell">
            {label}
          </div>
        ))}
      </div>
      <div className="calendar-month-grid-body">
        {matrix.map((week, wi) => (
          <div key={wi} className="calendar-month-grid-row">
            {toSundayFirst(week).map((date, di) => {
              const inCurrentMonth = date.getMonth() === month;
              const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const dayMeetings = meetingsByDay[key] || [];
              return (
                <div
                  key={di}
                  className={`calendar-month-grid-cell ${inCurrentMonth ? "" : "calendar-month-grid-cell-out"
                    }`}
                >
                  <div className="calendar-month-grid-cell-date">
                    {date.getDate()}
                  </div>
                  <div className="calendar-month-grid-cell-meetings">
                    {dayMeetings.map(({ meeting, start, end }, idx) => {
                      const title = meeting.title ?? "Meeting";
                      const colors = [
                        "var(--calendar-event-blue, #3b82f6)",
                        "var(--calendar-event-orange, #f97316)",
                        "var(--calendar-event-green, #22c55e)",
                        "var(--calendar-event-purple, #a855f7)",
                        "var(--calendar-event-red, #ef4444)",
                        "var(--calendar-event-teal, #14b8a6)",
                      ];
                      const bg = colors[idx % colors.length];
                      return (
                        <div
                          key={meeting.id ?? meeting.meeting_id ?? `${start.getTime()}`}
                          className="calendar-month-grid-meeting"
                          style={{ backgroundColor: bg }}
                          title={`${title} — ${formatTimeRange(start, end)}`}
                          onContextMenu={(e) => onMeetingRightClick?.(e, meeting)}
                        >
                          <span className="calendar-month-grid-meeting-title">{title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

