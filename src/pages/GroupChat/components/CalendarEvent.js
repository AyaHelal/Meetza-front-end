import React from 'react';
import { VideoCamera } from '@phosphor-icons/react';
import {
    isMeetingCurrentlyActive,
    isMeetingInFuture,
    isMeetingCompleted,
} from '../utils/mainChatMeetingUtils';
import './CalendarEvent.css';

const CalendarEvent = ({ event, onGoToMeeting }) => {
    const meeting = event._meeting;
    const isActive = meeting ? isMeetingCurrentlyActive(meeting) : false;
    const isFuture = meeting ? isMeetingInFuture(meeting) : false;
    const isCompleted = meeting ? isMeetingCompleted(meeting) : false;

    const buttonLabel = isActive ? 'Go to Meeting' : isCompleted ? 'Completed' : 'Scheduled';
    const showGreenActiveStyle = isActive;

    const handleClick = () => {
        if (meeting && isActive && typeof onGoToMeeting === 'function') {
            onGoToMeeting(meeting);
        }
    };

    return (
        <div className="calendar-event">
            <div className="event-top-section">
                <div className="event-date-block">
                    <div className="event-month">{event.month}</div>
                    <div className="event-day">{event.day}</div>
                </div>
                <div className="event-header-column">
                    <span className="event-online">{event.online}</span>
                    <div className="event-type-row">
                        <span className="event-dot"></span>
                        <span className="event-type">{event.type}</span>
                    </div>
                </div>
            </div>
            <div className="event-bottom-section">
                <div className="event-time-container">
                    <div className="event-time-block">
                        <span className="event-time-main">{event.startTime}</span>
                        <span className="event-time-period">{event.startPeriod}</span>
                    </div>
                    <span className="time-separator">&gt;</span>
                    <div className="event-time-block">
                        <span className="event-time-main">{event.endTime}</span>
                        <span className="event-time-period">{event.endPeriod}</span>
                    </div>
                </div>
                <div className="event-avatars-section">
                    <div className="event-avatars">
                        {(event.avatars || []).map((avatar, idx) => (
                            <div key={idx} className="event-avatar" style={{ marginLeft: idx > 0 ? '-8px' : '0' }}>
                                {avatar}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        className={`go-to-meeting-btn btn btn-sm border-0 ${showGreenActiveStyle ? 'go-to-meeting-btn--active' : ''}`}
                        onClick={handleClick}
                        disabled={!isActive}
                        title={isActive ? 'Join meeting' : isCompleted ? 'Meeting ended' : 'Meeting not started yet'}
                    >
                        <span className="meeting-icon">
                            <VideoCamera size={20} />
                        </span>
                        {buttonLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CalendarEvent;

