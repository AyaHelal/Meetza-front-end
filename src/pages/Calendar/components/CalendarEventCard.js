import React, { useState, useEffect } from "react";
import { Lock, LockOpen } from "@phosphor-icons/react";
import { formatDateForOverlay, formatCompactTimeRange } from "../utils/calendarUtils";

const MOBILE_COMPACT_CARD_QUERY = "(max-width: 768px)";

export default function CalendarEventCard({ event, style = {}, onMeetingRightClick }) {
  const [compactCard, setCompactCard] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_COMPACT_CARD_QUERY);
    const sync = () => setCompactCard(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const timeLabel = compactCard
    ? formatCompactTimeRange(event.start, event.end)
    : `${formatDateForOverlay(event.start)} to ${event.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  const now = new Date();
  const isFutureMeeting = event.start > now;
  const isLocked = isFutureMeeting;
  const lockBg = isFutureMeeting
    ? "rgba(231, 76, 60, 0.6)"
    : (event.lockType === "red" ? "rgba(231, 76, 60, 0.85)" : "rgba(52, 152, 219, 0.85)");
  const noDescription = !event.description?.trim();

  return (
    <div
      className={`calendar-event-card${noDescription ? " calendar-event-card--no-desc" : ""}${compactCard ? " calendar-event-card--compact" : ""}`}
      style={style}
      onContextMenu={(e) => onMeetingRightClick?.(e, event?._meeting)}
    >
      <div
        className="calendar-event-card-bg"
        style={{ backgroundImage: `url(${event.imageUrl})` }}
      >
        <span className="calendar-event-card-label">VERY BEAUTIFUL</span>
        <div className="calendar-event-card-on-image">
          <div className="calendar-event-card-group">
            <span>
              {event.groupName ||
                event._meeting?.group_name ||
                event._meeting?.groupName ||
                event._meeting?.course ||
                event._meeting?.group?.name ||
                "—"}
            </span>
          </div>
          <span className="calendar-event-card-lock" style={{ backgroundColor: lockBg }}>
            {isLocked ? <Lock size={16} weight="regular" /> : <LockOpen size={16} weight="regular" />}
          </span>
        </div>
      </div>
      <div className="calendar-event-card-time" style={{ backgroundColor: "hsla(204, 82.30%, 46.50%, 0.70)" }}>
        {timeLabel}
      </div>
      <div className="calendar-event-card-body">
        <h4 className="calendar-event-card-title">{event.title}</h4>
        {event.description?.trim() ? (
          <p className="calendar-event-card-desc">{event.description}</p>
        ) : null}
      </div>
    </div>
  );
}
