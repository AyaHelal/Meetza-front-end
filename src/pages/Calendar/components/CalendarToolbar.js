import React from "react";
import { Funnel, MagnifyingGlass, CalendarBlank } from "@phosphor-icons/react";

export default function CalendarToolbar({ searchQuery, onSearchChange }) {
  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-filter">
        <CalendarBlank size={20} className="calendar-toolbar-cal-icon" />
        <span className="calendar-toolbar-all-scheduled">All Scheduled</span>
      </div>
      <div className="calendar-toolbar-right">
        <button type="button" className="calendar-toolbar-filter-btn">
          <Funnel size={18} weight="bold" />
          Filter
        </button>
        <div className="calendar-toolbar-search">
          <MagnifyingGlass size={18} color="black" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="calendar-toolbar-search-input"
          />
        </div>
      </div>
    </div>
  );
}
