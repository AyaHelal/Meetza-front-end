import React from "react";
import CalendarHeader from "./components/CalendarHeader";
import CalendarToolbar from "./components/CalendarToolbar";
import CalendarNav from "./components/CalendarNav";
import CalendarWeekGrid from "./components/CalendarWeekGrid";
import CalendarMonthGrid from "./components/CalendarMonthGrid";
import { useCalendar } from "./hooks/useCalendar";
import "./Calendar.css";

export default function Calendar() {
  const {
    viewMode,
    currentDate,
    setCurrentDate,
    searchQuery,
    setSearchQuery,
    groupsList,
    selectedGroupId,
    setSelectedGroupId,
    rangeStart,
    rangeEnd,
    loading,
    error,
    weekDates,
    filteredWeekEvents,
    filteredMonthMeetings,
    showWeekLikeGrid,
    isAdminRole,
    groupsMap,
    handleJoinMeeting,
    handleDeleteMeeting,
    goPrev,
    goNext,
    handleRangeChange,
    handleViewModeChange,
  } = useCalendar();

  return (
    <div className="calendar-page">
      <div className="calendar-toolbar-card">
        <CalendarHeader />
        <CalendarToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          groupsList={groupsList}
          selectedGroupId={selectedGroupId}
          onGroupChange={setSelectedGroupId}
        />
        <CalendarNav
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          weekDates={weekDates}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={handleRangeChange}
        />
      </div>
      {error && <div className="calendar-error">{error}</div>}
      {loading ? (
        <div className="calendar-loading">Loading meetings…</div>
      ) : showWeekLikeGrid ? (
        <CalendarWeekGrid
          events={filteredWeekEvents}
          weekDates={weekDates}
          onPrev={goPrev}
          onNext={goNext}
          onJoinMeeting={handleJoinMeeting}
          onDeleteMeeting={handleDeleteMeeting}
          isAdminRole={isAdminRole}
        />
      ) : (
        <CalendarMonthGrid
          currentDate={currentDate}
          meetings={filteredMonthMeetings}
          groupsMap={groupsMap}
          onJoinMeeting={handleJoinMeeting}
          onDeleteMeeting={handleDeleteMeeting}
          isAdminRole={isAdminRole}
        />
      )}
    </div>
  );
}

