import React from "react";
import { SignOut, Record } from "@phosphor-icons/react";

const MeetingRoomHeader = ({ meetingTitle, onLeaveMeeting, meetingId, isRecording }) => {
  return (
    <div className="meeting-room-header">
      <div className="meeting-room-title-wrap">
        <h1 className="meeting-room-title">Meeting room</h1>
        <p className="meeting-room-subtitle">{meetingTitle || "Meeting"}</p>
      </div>
      {isRecording && (
        <div className="meeting-room-recording-badge" role="status" aria-live="polite">
          <span className="meeting-room-recording-dot" />
          <span className="meeting-room-recording-text">Recording</span>
          <Record size={16} weight="fill" className="meeting-room-recording-icon" />
        </div>
      )}
      <button
        type="button"
        className="meeting-room-expand-btn"
        aria-label="Leave meeting"
        onClick={onLeaveMeeting}
        disabled={!meetingId}
        title={!meetingId ? "Missing meeting id" : "Leave meeting"}
      >
        <SignOut size={20} weight="bold" />
      </button>
    </div>
  );
};

export default MeetingRoomHeader;
