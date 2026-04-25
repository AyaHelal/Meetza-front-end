import React from "react";
import { Link } from "react-router-dom";
import {
  VideoCamera,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PencilSimple,
  Trash,
  CalendarPlusIcon,
  CalendarXIcon,
  CaretDown,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";
import { AdminCreateMeetingForm } from "./AdminCreateMeetingForm";
import { WeeklyDeleteModal } from "./WeeklyDeleteModal";

export function AdminMeetingPageContent(props) {
  const {
    meetings,
    loading,
    groups,
    groupsLoading,
    editingMeetingId,
    showDeleteMeetingModal,
    showWeeklyDeleteModal,
    deletingMeeting,
    showCreateMeetingModal,
    weeklyDropdownOpen,
    setWeeklyDropdownOpen,
    isMobileTablet,
    formData,
    handleInputChange,
    resetFormForCreate,
    openCreateMeetingModal,
    closeCreateMeetingModal,
    handleFormSubmit,
    handleJoinMeeting,
    handleWeeklyStatusChange,
    handleDeleteMeetingClick,
    confirmDeleteMeeting,
    closeDeleteMeetingModal,
    closeWeeklyDeleteModal,
    handleEditMeeting,
    isRecording,
    formatDate,
    getTimeRange,
    isMeetingEnded,
    isMeetingNotStartedYet,
    searchTerm,
    setSearchTerm,
  } = props;

  return (
    <div className="admin-meeting-page">
      {/* ── LEFT CONTENT ── */}
      <div className="admin-meeting-content">
        {/* Header */}
        <div className="admin-meeting-header">
          <div className="admin-meeting-header-row">
            <h1>Meeting Management Page</h1>
            <div className="admin-meeting-header-search">
              <div className="search-bar">
                <MagnifyingGlass size={20} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Search by meeting name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="admin-meeting-header-create-btn" onClick={openCreateMeetingModal}>
              Create meeting
            </button>
          </div>
        </div>

        {/* Meetings Grid */}
        <div className="meetings-grid">
          {loading ? (
            <div className="loading-message">Loading meetings…</div>
          ) : meetings.length === 0 ? (
            <div className="no-meetings">No meetings available</div>
          ) : (
            meetings.map((meeting) => (
              <div className="meeting-card" key={meeting.id || meeting.meeting_id}>
                {/* Top: thumbnail + info + date */}
                <div className="meeting-card-top">
                  <div className="meeting-thumbnail">
                    {(() => {
                      const poster = meeting.poster_url || meeting.poster;
                      const posterSrc = typeof poster === "string" && poster.trim() ? poster.trim() : null;
                      return posterSrc ? (
                        <img
                          src={posterSrc}
                          alt="meeting"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="default-thumbnail">
                          <VideoCamera size={18} weight="fill" />
                        </div>
                      );
                    })()}
                  </div>

                  <div className="meeting-card-info">
                    <p className="meeting-name">{meeting.title || meeting.group_name || "Group name"}</p>
                    <p className="meeting-subtitle">
                      {meeting.group_id ? (
                        <Link
                          to="/messages"
                          state={{ groupId: meeting.group_id }}
                          className="meeting-group-link"
                        >
                          {meeting.course || groups.find((g) => g.id === meeting.group_id)?.name || "—"}
                        </Link>
                      ) : (
                        meeting.course || groups.find((g) => g.id === meeting.group_id)?.name || "—"
                      )}
                    </p>
                  </div>

                  <span className="meeting-date">{formatDate(meeting.start_time || meeting.created_at)}</span>
                </div>

                {/* Divider */}
                <div className="meeting-card-divider" />

                {/* Body */}
                <div className="meeting-card-body">
                  <p className="meeting-description">
                    <strong>Description : </strong>
                    {meeting.description || "No description"}
                  </p>

                  <div className={`recorded-meeting ${isRecording(meeting.record_meeting) ? "recorded" : "not-recorded"}`}>
                    {isRecording(meeting.record_meeting) ? (
                      <VideoCameraIcon size={32} weight="fill" />
                    ) : (
                      <VideoCameraSlashIcon size={18} weight="fill" />
                    )}
                    Recorded Meeting
                  </div>

                  <div className="weekly-meeting-dropdown">
                    <button
                      type="button"
                      className={`weekly-meeting-trigger ${meeting.is_weekly === 1 ? "weekly-active" : meeting.is_weekly === 0 ? "weekly-inactive" : ""}`}
                      onClick={() => setWeeklyDropdownOpen(weeklyDropdownOpen === meeting.id ? null : meeting.id)}
                    >
                      {meeting.is_weekly === 1 ? (
                        <CalendarPlusIcon size={20} weight="fill" />
                      ) : meeting.is_weekly === 0 ? (
                        <CalendarXIcon size={20} weight="fill" />
                      ) : (
                        <CalendarPlusIcon size={20} weight="fill" />
                      )}
                      {meeting.is_weekly === 1 ? "Active Weekly" : meeting.is_weekly === 0 ? "Inactive Weekly" : "Set Weekly"}
                      <CaretDown size={12} weight="bold" />
                    </button>

                    {weeklyDropdownOpen === meeting.id && (
                      <div className="weekly-dropdown-menu">
                        <button
                          type="button"
                          className="weekly-dropdown-item"
                          onClick={() => handleWeeklyStatusChange(meeting.id || meeting.meeting_id, "active")}
                        >
                          <CalendarPlusIcon size={16} weight="fill" />
                          Active Weekly
                        </button>
                        <button
                          type="button"
                          className="weekly-dropdown-item"
                          onClick={() => handleWeeklyStatusChange(meeting.id || meeting.meeting_id, "Inactive")}
                        >
                          <CalendarXIcon size={16} weight="fill" />
                          Inactive Weekly
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="meeting-time">
                    <strong>Time : </strong>
                    {getTimeRange(meeting.start_time, meeting.end_time)}
                  </p>

                  {!isMeetingNotStartedYet(meeting) && (
                    <button
                      type="button"
                      className={`join-meeting-btn ${isMeetingEnded(meeting) ? "join-meeting-btn--ended" : ""}`}
                      onClick={() => !isMeetingEnded(meeting) && handleJoinMeeting(meeting.id || meeting.meeting_id)}
                      disabled={isMeetingEnded(meeting)}
                      title={isMeetingEnded(meeting) ? "Meeting has ended" : "Join meeting"}
                    >
                      {isMeetingEnded(meeting) ? "Ended" : "Join"}
                    </button>
                  )}

                  <div className="meeting-card-actions">
                    <button
                      type="button"
                      className="meeting-card-action-btn edit-btn"
                      onClick={() => handleEditMeeting(meeting)}
                      title="Edit"
                      aria-label="Edit meeting"
                    >
                      <PencilSimple size={18} weight="regular" />
                    </button>
                    <button
                      type="button"
                      className="meeting-card-action-btn delete-btn"
                      onClick={() => handleDeleteMeetingClick(meeting)}
                      title="Delete"
                      aria-label="Delete meeting"
                    >
                      <Trash size={18} weight="regular" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR (desktop only; mobile/tablet uses modal) ── */}
      {!isMobileTablet && (
        <div className="create-meeting-sidebar">
          <h2>{editingMeetingId ? "Edit Meeting" : "Create Meeting"}</h2>
          <AdminCreateMeetingForm
            posterInputId="poster-upload"
            editingMeetingId={editingMeetingId}
            formData={formData}
            handleInputChange={handleInputChange}
            handleFormSubmit={handleFormSubmit}
            groupsLoading={groupsLoading}
            groups={groups}
            resetFormForCreate={resetFormForCreate}
          />
        </div>
      )}

      {isMobileTablet && showCreateMeetingModal && (
        <div className="admin-meeting-modal-overlay" role="presentation" onClick={closeCreateMeetingModal}>
          <div
            className="admin-meeting-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-meeting-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-meeting-modal-toolbar">
              <h2 id="admin-meeting-modal-title">{editingMeetingId ? "Edit Meeting" : "Create Meeting"}</h2>
              <button
                type="button"
                className="admin-meeting-modal-close"
                onClick={closeCreateMeetingModal}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>
            <div className="admin-meeting-modal-body">
              <AdminCreateMeetingForm
                posterInputId="poster-upload-modal"
                editingMeetingId={editingMeetingId}
                formData={formData}
                handleInputChange={handleInputChange}
                handleFormSubmit={handleFormSubmit}
                groupsLoading={groupsLoading}
                groups={groups}
                resetFormForCreate={resetFormForCreate}
              />
            </div>
          </div>
        </div>
      )}

      <WeeklyDeleteModal
        show={showWeeklyDeleteModal}
        onClose={closeWeeklyDeleteModal}
        onConfirmThisWeek={() => confirmDeleteMeeting(false)}
        onConfirmAllWeeks={() => confirmDeleteMeeting(true)}
        confirming={deletingMeeting}
      />

      <ConfirmDeleteModal
        show={showDeleteMeetingModal}
        onClose={closeDeleteMeetingModal}
        onConfirm={confirmDeleteMeeting}
        title="Delete Meeting"
        message="Are you sure you want to delete this meeting? This action cannot be undone."
        confirming={deletingMeeting}
      />
    </div>
  );
}
