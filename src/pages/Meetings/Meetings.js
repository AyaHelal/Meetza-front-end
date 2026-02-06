import React from "react";
import MeetingRoom from "./components/MeetingRoom";
import "./Meetings.css";

const Meetings = () => {
    return (
        <div className="meetings-container">
        {/* Center: meeting room card + empty comment area */}
        <div className="meetings-center">
            <MeetingRoom />
            {/* Empty place for comments */}
            <div className="meetings-comments-placeholder">
            <h4 className="meetings-comments-title">Comments during meeting</h4>
            </div>
        </div>

        {/* Right: empty space for sidebar */}
        <div className="meetings-right-placeholder" aria-hidden="true" />
        </div>
    );
};

export default Meetings;
