import React from "react";
import { SignOut } from "@phosphor-icons/react";

const MeetingRoomHeader = ({ meetingTitle, onLeaveMeeting, meetingId }) => {
  return (
    <div className="meeting-room-header">
      <div className="meeting-room-title-wrap">
        <h1 className="meeting-room-title">Meeting room</h1>
        <p className="meeting-room-subtitle">{meetingTitle || "Meeting"}</p>
      </div>
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
