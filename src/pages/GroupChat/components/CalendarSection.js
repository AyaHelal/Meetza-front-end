import React from 'react';
import CalendarEvent from './CalendarEvent';
import './CalendarSection.css';

const CalendarSection = ({ calendarEvents }) => {
    return (
        <div className="calendar-section rounded-4 shadow-sm p-3">
            <h4>Calendar</h4>
            {calendarEvents.map((event, index) => (
                <CalendarEvent key={index} event={event} />
            ))}
        </div>
    );
};

export default CalendarSection;

