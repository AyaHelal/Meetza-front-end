import React, { useRef, useEffect } from "react";
import Flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalendarBlank } from "@phosphor-icons/react";
import {
  formatMonthYear,
  formatMonthRange,
  formatShortDate,
  formatRangeDisplay,
} from "../utils/calendarUtils";

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
  rangeStart,
  rangeEnd,
  onRangeChange,
}) {
  const inputRef = useRef(null);
  const flatpickrRef = useRef(null);
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;

  const monthYear =
    viewMode === "range" && rangeStart && rangeEnd
      ? formatMonthRange(rangeStart, rangeEnd)
      : weekDates.length > 0
        ? formatMonthYear(weekDates[0])
        : formatMonthYear(currentDate);

  const today = new Date();
  const isViewingToday =
    viewMode === "day" &&
    weekDates.length === 1 &&
    weekDates[0].getFullYear() === today.getFullYear() &&
    weekDates[0].getMonth() === today.getMonth() &&
    weekDates[0].getDate() === today.getDate();

  const rangeStr =
    rangeStart && rangeEnd
      ? formatRangeDisplay(rangeStart, rangeEnd)
      : weekDates.length >= 2
        ? `${formatShortDate(weekDates[0])} – ${formatShortDate(weekDates[weekDates.length - 1])} ${weekDates[0].getFullYear()}`
        : weekDates.length === 1
          ? formatShortDate(weekDates[0])
          : "";

  useEffect(() => {
    if (!inputRef.current) return;
    const fp = new Flatpickr(inputRef.current, {
      mode: "range",
      dateFormat: "Y-m-d",
      altInput: false,
      allowInput: false,
      onChange(selectedDates) {
        if (selectedDates.length === 2) {
          const d0 = selectedDates[0];
          const d1 = selectedDates[1];
          const start = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
          const end = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
          if (start.getTime() > end.getTime()) {
            onRangeChangeRef.current?.(end, start);
          } else {
            onRangeChangeRef.current?.(start, end);
          }
        }
      },
    });
    flatpickrRef.current = fp;
    return () => {
      fp.destroy();
      flatpickrRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fp = flatpickrRef.current;
    if (!fp) return;
    if (rangeStart && rangeEnd) {
      fp.setDate([rangeStart, rangeEnd], false);
    } else {
      fp.clear();
    }
  }, [rangeStart, rangeEnd]);

  return (
    <div className="calendar-nav">
      <div className="calendar-nav-left">
        <span className="calendar-nav-month">{monthYear}</span>
        {isViewingToday && <span className="calendar-nav-today">Today</span>}
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
          <div className="calendar-nav-range-input-wrap">
            {rangeStart && rangeEnd && (
              <span className="calendar-nav-range-display" aria-hidden="true">
                {formatRangeDisplay(rangeStart, rangeEnd)}
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              className={`calendar-nav-range-input ${rangeStart && rangeEnd ? "has-range" : ""}`}
              placeholder={!rangeStart || !rangeEnd ? (rangeStr || "Select date range") : ""}
              readOnly
              aria-label="Pick start and end date"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
