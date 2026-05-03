import React from 'react';
import Lottie from 'lottie-react';
import CalendarEvent from './CalendarEvent';
import noDataFoundAnimation from '../../../lottie/noDataFound.json';
import './CalendarSection.css';

const CalendarSection = ({ calendarEvents, onGoToMeeting }) => {
    return (
        <div className="calendar-section rounded-4 shadow-sm p-3">
            <h4>Calendar</h4>
            {calendarEvents.length === 0 ? (
                <div className="calendar-section-empty-state">
                    <p className="calendar-section-empty-text">No meetings have been created</p>
                    <div className="calendar-section-empty-illustration">
                        <Lottie animationData={noDataFoundAnimation} loop style={{ maxHeight: 180 }} />
                    </div>
                </div>
            ) : (
                calendarEvents.map((event, index) => (
                    <CalendarEvent
                        key={event._meeting?.id ?? index}
                        event={event}
                        onGoToMeeting={onGoToMeeting}
                    />
                ))
            )}
        </div>
    );
};

export default CalendarSection;

