import React, { useContext } from "react";
import MeetingRightSidebar from "./components/MeetingRightSidebar";
import "./Meetings.css";
import { MeetingRoom } from "./index";
import MeetingChat from "./components/MeetingChat";
import { MeetingProvider, MeetingContext } from "../../context/MeetingContext";

const MeetingsContent = () => (
  <div className="meetings-container">
    <div className="meetings-center">
      <MeetingRoom />
      <MeetingChat />
    </div>
    <MeetingRightSidebar />
  </div>
);

/**
 * When an active meeting exists, AppLayout renders the single persistent MeetingRoom (visible on /meetings, hidden elsewhere).
 * Outlet must not mount a second MeetingRoom — that remount used to drop remote peers/audio when returning to the meeting.
 */
const Meetings = () => {
  const meetingCtx = useContext(MeetingContext);
  if (meetingCtx != null) {
    return null;
  }
  return (
    <MeetingProvider>
      <MeetingsContent />
    </MeetingProvider>
  );
};

export default Meetings;
