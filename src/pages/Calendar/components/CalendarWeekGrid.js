import React, { useRef, useEffect } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import CalendarEventCard from "./CalendarEventCard";
import { formatDayShort, formatDayNum } from "../utils/calendarUtils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ✅ كبرنا الـ row عشان الـ card تاخد مساحة كافية
const ROW_HEIGHT_PX = 200;
/** Margin inside the time row (gap above/below the card within the slot) */
const ROW_INSET_PX = 6;
const HEADER_DAY_MIN_WIDTH = 120;

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarWeekGrid({ events, weekDates, onPrev, onNext }) {
  const today = new Date();
  const headerDaysScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  const isWeekOrDayView = weekDates.length <= 7;

  useEffect(() => {
    if (isWeekOrDayView) return;
    const headerEl = headerDaysScrollRef.current;
    const bodyEl = bodyScrollRef.current;
    if (!headerEl || !bodyEl) return;
    const syncHeaderToBody = () => {
      headerEl.scrollLeft = bodyEl.scrollLeft;
    };
    const syncBodyToHeader = () => {
      bodyEl.scrollLeft = headerEl.scrollLeft;
    };
    bodyEl.addEventListener("scroll", syncHeaderToBody);
    headerEl.addEventListener("scroll", syncBodyToHeader);
    return () => {
      bodyEl.removeEventListener("scroll", syncHeaderToBody);
      headerEl.removeEventListener("scroll", syncBodyToHeader);
    };
  }, [isWeekOrDayView]);

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
        {isWeekOrDayView ? (
          <div className="calendar-week-header-days-fixed">
            {weekDates.map((date, colIndex) => (
              <div
                key={colIndex}
                className={`calendar-week-header-day calendar-week-header-day-equal ${isSameDay(date, today) ? "active" : ""}`}
              >
                {formatDayShort(date)} {formatDayNum(date)}
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={headerDaysScrollRef}
            className="calendar-week-header-days-scroll"
            role="region"
            aria-label="Date headers"
          >
            <div
              className="calendar-week-header-days-inner"
              style={{ minWidth: weekDates.length * HEADER_DAY_MIN_WIDTH }}
            >
              {weekDates.map((date, colIndex) => (
                <div
                  key={colIndex}
                  className={`calendar-week-header-day ${isSameDay(date, today) ? "active" : ""}`}
                >
                  {formatDayShort(date)} {formatDayNum(date)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div ref={bodyScrollRef} className="calendar-week-body">
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
                    const startH = ev.start.getHours();
                    const endH = ev.end.getHours();
                    const topPx = startH * ROW_HEIGHT_PX;
                    const heightPx = Math.max(endH - startH, 1) * ROW_HEIGHT_PX;
                    const slotTop = topPx + ROW_INSET_PX;
                    const slotHeight = heightPx - 2 * ROW_INSET_PX;
                    const hasDescription = !!ev.description?.trim();
                    const isDayView = weekDates.length === 1;
                    const verticalCenterTransform =
                      hasDescription ? undefined : isDayView ? "translateX(-50%) translateY(-50%)" : "translateY(-50%)";
                    return (
                      <CalendarEventCard
                        key={ev.id}
                        event={ev}
                        style={{
                          top: hasDescription ? slotTop : topPx + heightPx / 2,
                          height: hasDescription ? slotHeight : "auto",
                          maxHeight: slotHeight,
                          transform: verticalCenterTransform,
                        }}
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