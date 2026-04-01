import React, { useRef, useEffect, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import CalendarEventCard from "./CalendarEventCard";
import { formatDayShort, formatDayNum } from "../utils/calendarUtils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ROW_HEIGHT_PX = 200;
/** Margin inside the time row (gap above/below the card within the slot) */
const ROW_INSET_PX = 6;
/** Card height when there is no description (image + title only). Uses most of the hour row so the photo can be tall. */
const CARD_HEIGHT_NO_DESC_PX = 176;
/** Mobile: cap height when description exists so the card doesn’t fill the whole hour slot with empty space */
const MOBILE_CARD_MAX_WITH_DESC_PX = 142;
const HEADER_DAY_MIN_WIDTH_DESKTOP = 120;
/** Wide enough for event text; week still scrolls horizontally on phones */
const HEADER_DAY_MIN_WIDTH_MOBILE = 118;
const MOBILE_MAX_WIDTH_QUERY = "(max-width: 768px)";

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarWeekGrid({ events, weekDates, onPrev, onNext, onJoinMeeting, onDeleteMeeting, isAdminRole }) {
  const today = new Date();
  const headerDaysScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_MAX_WIDTH_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /** Desktop: fixed equal columns for week/day (≤7). Mobile: horizontal scroll + synced header so all days are reachable. Range (>7): always scroll. */
  const useFixedHeader =
    weekDates.length === 1 || (weekDates.length <= 7 && weekDates.length > 1 && !isMobile);

  const headerCellMinWidth = isMobile ? HEADER_DAY_MIN_WIDTH_MOBILE : HEADER_DAY_MIN_WIDTH_DESKTOP;

  /** Scroll mode: range / mobile week — desktop uses equal fr columns to fill width; mobile uses fixed px + horizontal scroll */
  const scrollMode = !useFixedHeader;
  const headerScrollInnerStyle = scrollMode
    ? isMobile
      ? {
        display: "grid",
        width: "max-content",
        minWidth: "100%",
        gridTemplateColumns: `repeat(${weekDates.length}, ${headerCellMinWidth}px)`,
      }
      : {
        display: "grid",
        width: "100%",
        minWidth: "100%",
        boxSizing: "border-box",
        gridTemplateColumns: `repeat(${weekDates.length}, minmax(${headerCellMinWidth}px, 1fr))`,
      }
    : undefined;

  const weekDaysStyle = scrollMode
    ? isMobile
      ? {
        display: "grid",
        width: "max-content",
        minWidth: "100%",
        gridTemplateColumns: `repeat(${weekDates.length}, ${headerCellMinWidth}px)`,
      }
      : {
        display: "grid",
        width: "100%",
        minWidth: "100%",
        boxSizing: "border-box",
        gridTemplateColumns: `repeat(${weekDates.length}, minmax(${headerCellMinWidth}px, 1fr))`,
      }
    : undefined;

  useEffect(() => {
    if (useFixedHeader) return;
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
  }, [useFixedHeader, weekDates.length]);

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
        {useFixedHeader ? (
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
              className={`calendar-week-header-days-inner${scrollMode && !isMobile ? " calendar-week-header-days-inner--fill" : ""}`}
              style={headerScrollInnerStyle}
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

        <div
          className={`calendar-week-days${scrollMode ? " calendar-week-days--grid" : ""}`}
          style={weekDaysStyle}
        >
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
                    const topPx = startH * ROW_HEIGHT_PX;
                    const slotTop = topPx + ROW_INSET_PX;
                    const fullSlotHeight = ROW_HEIGHT_PX - 2 * ROW_INSET_PX;
                    const hasDescription = !!ev.description?.trim();
                    const cardHeight = hasDescription
                      ? isMobile
                        ? Math.min(fullSlotHeight, MOBILE_CARD_MAX_WITH_DESC_PX)
                        : fullSlotHeight
                      : CARD_HEIGHT_NO_DESC_PX;
                    const cardTop = isMobile
                      ? slotTop + (fullSlotHeight - cardHeight) / 2
                      : slotTop;
                    return (
                      <CalendarEventCard
                        key={ev.id}
                        event={ev}
                        onJoinMeeting={onJoinMeeting}
                        onDeleteMeeting={onDeleteMeeting}
                        isAdminRole={isAdminRole}
                        style={{
                          top: cardTop,
                          height: cardHeight,
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