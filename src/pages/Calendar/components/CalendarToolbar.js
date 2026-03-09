import React, { useState, useRef, useEffect } from "react";
import { Funnel, MagnifyingGlass, CalendarBlank, Check } from "@phosphor-icons/react";

export default function CalendarToolbar({
  searchQuery,
  onSearchChange,
  groupsList = [],
  selectedGroupId,
  onGroupChange,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGroupName = selectedGroupId ? groupsList.find((g) => g.id === selectedGroupId)?.name : null;

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-filter">
        <CalendarBlank size={20} className="calendar-toolbar-cal-icon" />
        <span className="calendar-toolbar-all-scheduled">
          {selectedGroupName != null ? selectedGroupName : "All Scheduled"}
        </span>
      </div>
      <div className="calendar-toolbar-right">
        <div className="calendar-toolbar-filter-dropdown" ref={filterRef}>
          <button
            type="button"
            className={`calendar-toolbar-filter-btn ${filterOpen ? "open" : ""}`}
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            aria-haspopup="listbox"
          >
            <Funnel size={18} weight="bold" />
            Filter
          </button>
          {filterOpen && (
            <ul className="calendar-toolbar-filter-list" role="listbox">
              <li
                role="option"
                aria-selected={!selectedGroupId}
                className={`calendar-toolbar-filter-item ${!selectedGroupId ? "selected" : ""}`}
                onClick={() => {
                  onGroupChange?.(null);
                  setFilterOpen(false);
                }}
              >
                <span className="calendar-toolbar-filter-check">
                  {!selectedGroupId && <Check size={14} weight="bold" />}
                </span>
                <span>All groups</span>
              </li>
              {groupsList.map((g) => (
                <li
                  key={g.id}
                  role="option"
                  aria-selected={selectedGroupId === g.id}
                  className={`calendar-toolbar-filter-item ${selectedGroupId === g.id ? "selected" : ""}`}
                  onClick={() => {
                    onGroupChange?.(g.id);
                    setFilterOpen(false);
                  }}
                >
                  <span className="calendar-toolbar-filter-check">
                    {selectedGroupId === g.id && <Check size={14} weight="bold" />}
                  </span>
                  <span>{g.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
