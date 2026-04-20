import React, { useState, useEffect } from "react";
import { Lock, LockOpen, Trash, VideoCamera } from "@phosphor-icons/react";
import { formatDateForOverlay, formatCompactTimeRange, isMeetingLive } from "../utils/calendarUtils";

const MOBILE_COMPACT_CARD_QUERY = "(max-width: 768px)";

export default function CalendarEventCard({ event, style = {}, onJoinMeeting, onDeleteMeeting, isAdminRole }) {
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
  const descriptionText = String(event.description || "").trim();
  const noDescription = !descriptionText;
  const hasPoster = Boolean(String(event?.imageUrl || "").trim());

  const isLive = isMeetingLive(event?._meeting);
  /** Same opacity for live (blue) vs not live (red) — translucent badge */
  const LOCK_BG_LIVE = "rgba(52, 152, 219, 0.5)";
  const LOCK_BG_OFF = "rgba(231, 76, 60, 0.5)";
  const lockBg = isLive ? LOCK_BG_LIVE : LOCK_BG_OFF;

  return (
    <div
      className={`calendar-event-card${noDescription ? " calendar-event-card--no-desc" : ""}${compactCard ? " calendar-event-card--compact" : ""}${isLive ? " calendar-event-card--live" : ""}`}
      style={{ ...style, cursor: isLive ? "pointer" : "default" }}
      onClick={() => {
        if (isLive) onJoinMeeting?.(event?._meeting);
      }}
    >
      <div
        className="calendar-event-card-bg"
        style={
          hasPoster
            ? { backgroundImage: `url(${String(event.imageUrl).trim()})` }
            : { backgroundImage: "linear-gradient(135deg, rgba(33,74,184,0.55), rgba(0,220,133,0.25))" }
        }
      >
        {!hasPoster ? (
          <div className="calendar-event-card-bg-placeholder" aria-hidden="true">
            <VideoCamera size={28} weight="fill" />
          </div>
        ) : null}

        <div className="calendar-event-card-time" style={{ backgroundColor: "rgb(22 144 185)" }}>
          {timeLabel}
        </div>

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
            {isLive ? <LockOpen size={16} weight="regular" /> : <Lock size={16} weight="regular" />}
          </span>
        </div>
      </div>
      <div className="calendar-event-card-body">
        <div className="calendar-event-card-body-header">
          <h4 className="calendar-event-card-title">{event.title}</h4>
          {isAdminRole && (
            <button
              type="button"
              className="calendar-card-delete-icon"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteMeeting?.(event._meeting);
              }}
              title="Delete meeting"
            >
              <Trash size={18} weight="regular" />
            </button>
          )}
        </div>
        <p
          className={`calendar-event-card-desc${noDescription ? " calendar-event-card-desc--empty" : ""}`}
          aria-hidden={noDescription ? "true" : undefined}
        >
          {noDescription ? "description" : descriptionText}
        </p>
      </div>
    </div>
  );
}
