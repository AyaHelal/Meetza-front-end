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

/** When an active meeting exists, AppLayout already wraps the route with MeetingProvider — avoid a second provider + second MeetingRoom (duplicate pre-join). */
const Meetings = () => {
  const meetingCtx = useContext(MeetingContext);
  if (meetingCtx != null) {
    return <MeetingsContent />;
  }
  return (
    <MeetingProvider>
      <MeetingsContent />
    </MeetingProvider>
  );
};

export default Meetings;
