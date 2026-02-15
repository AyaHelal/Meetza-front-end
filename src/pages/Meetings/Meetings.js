import React from 'react'
import MeetingRightSidebar from './components/MeetingRightSidebar'
import './Meetings.css'
import MeetingRoom from "./components/MeetingRoom";
import { MeetingProvider } from '../../context/MeetingContext';

const Meetings = () => {
    return (
        <MeetingProvider>
            <div className="meetings-container">
                {/* Center: meeting room card + empty comment area */}
                <div className="meetings-center">
                    <MeetingRoom />
                    {/* Empty place for comments */}
                    <div className="meetings-comments-placeholder">
                        <h4 className="meetings-comments-title">Meeting Chat</h4>
                    </div>
                </div>

                <MeetingRightSidebar />
            </div>
        </MeetingProvider>
    );
};

export default Meetings;
