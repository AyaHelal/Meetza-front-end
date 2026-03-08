import React from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { formatMonthYear, formatDayShort, formatDayNum, formatShortDate } from "../utils/calendarUtils";

const VIEWS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export default function CalendarNav({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  weekDates,
}) {
  const monthYear = formatMonthYear(currentDate);
  const weekRangeStr =
    weekDates.length >= 2
      ? `${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6])} ${weekDates[0].getFullYear()}`
      : "";

  return (
    <div className="calendar-nav">
      <div className="calendar-nav-left">
        <span className="calendar-nav-month">{monthYear}</span>
        <span className="calendar-nav-today">Today</span>
      </div>
      <div className="calendar-nav-right">
        <div className="calendar-nav-views">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`calendar-nav-view-btn ${viewMode === v.id ? "active" : ""}`}
              onClick={() => onViewModeChange(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="calendar-nav-range">
          <CalendarBlank size={18} />
          <span>{weekRangeStr}</span>
        </div>
      </div>
    </div>
  );
}
