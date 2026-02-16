import React from 'react'
import MeetingRightSidebar from './components/MeetingRightSidebar'
import './Meetings.css'
import MeetingRoom from "./components/MeetingRoom";
import MeetingChat from "./components/MeetingChat";
import { MeetingProvider } from '../../context/MeetingContext';

const Meetings = () => {
    return (
        <MeetingProvider>
            <div className="meetings-container">
                {/* Center: meeting room card + chat area */}
                <div className="meetings-center">
                    <MeetingRoom />
                    <MeetingChat />
                </div>

                <MeetingRightSidebar />
            </div>
        </MeetingProvider>
    );
};

export default Meetings;
