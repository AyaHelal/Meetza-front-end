import React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import CalendarEventCard from "./CalendarEventCard";
import { formatDayShort, formatDayNum } from "../utils/calendarUtils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ROW_HEIGHT_PX = 48;

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarWeekGrid({ events, weekDates, onPrev, onNext }) {
  const today = new Date();
  return (
    <div className="calendar-week-grid">
      <div className="calendar-week-header">
        <div className="calendar-week-header-arrows">
          <button type="button" className="calendar-week-arrow" onClick={onPrev} aria-label="Previous">
            <CaretLeft size={20} weight="bold" />
          </button>
          <button type="button" className="calendar-week-arrow" onClick={onNext} aria-label="Next">
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
        {weekDates.map((date, colIndex) => (
          <div
            key={colIndex}
            className={`calendar-week-header-day ${isSameDay(date, today) ? "active" : ""}`}
          >
            {formatDayShort(date)} {formatDayNum(date)}
          </div>
        ))}
      </div>

      <div className="calendar-week-body">
        <div className="calendar-week-time-col">
          {HOURS.map((h) => (
            <div key={h} className="calendar-week-time-cell" style={{ height: ROW_HEIGHT_PX }}>
              {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
            </div>
          ))}
        </div>
        <div className="calendar-week-days">
          {weekDates.map((date, colIndex) => (
            <div key={colIndex} className="calendar-week-day-col">
              <div className="calendar-week-day-cells">
                {HOURS.map((h) => (
                  <div key={h} className="calendar-week-day-cell" style={{ height: ROW_HEIGHT_PX }} />
                ))}
              </div>
              <div className="calendar-week-events">
                {events
                  .filter((ev) => ev.dayIndex === colIndex)
                  .map((ev) => {
                    const startH = ev.start.getHours() + ev.start.getMinutes() / 60;
                    const endH = ev.end.getHours() + ev.end.getMinutes() / 60;
                    const topPx = startH * ROW_HEIGHT_PX;
                    const heightPx = Math.max((endH - startH) * ROW_HEIGHT_PX, 180);
                    return (
                      <CalendarEventCard
                        key={ev.id}
                        event={ev}
                        style={{ top: topPx, height: heightPx }}
                      />
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
