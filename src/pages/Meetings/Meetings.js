import React from 'react'
import MeetingRightSidebar from './components/MeetingRightSidebar'
import './Meetings.css'
import MeetingRoom from "./components/MeetingRoom";

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

        <MeetingRightSidebar />
        </div>
    );
};

export default Meetings;
