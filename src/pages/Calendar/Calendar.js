import React, { useState, useMemo } from "react";
import CalendarHeader from "./components/CalendarHeader";
import CalendarToolbar from "./components/CalendarToolbar";
import CalendarNav from "./components/CalendarNav";
import CalendarWeekGrid from "./components/CalendarWeekGrid";
import { getWeekDates, defaultCalendarEvents } from "./utils/calendarUtils";
import "./Calendar.css";

const VIEW_MODE = { DAY: "day", WEEK: "week", MONTH: "month" };

export default function Calendar() {
  const [viewMode, setViewMode] = useState(VIEW_MODE.WEEK);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const events = useMemo(() => defaultCalendarEvents(weekDates), [weekDates]);

  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === VIEW_MODE.WEEK) d.setDate(d.getDate() - 7);
    else if (viewMode === VIEW_MODE.MONTH) d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === VIEW_MODE.WEEK) d.setDate(d.getDate() + 7);
    else if (viewMode === VIEW_MODE.MONTH) d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  return (
    <div className="calendar-page">
      <div className="calendar-toolbar-card">
        <CalendarHeader />
        <CalendarToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <CalendarNav
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          weekDates={weekDates}
        />
      </div>
      <CalendarWeekGrid
        events={events}
        weekDates={weekDates}
        onPrev={goPrev}
        onNext={goNext}
      />
    </div>
  );
}
