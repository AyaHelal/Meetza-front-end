import React from 'react';
import { YoutubeLogo } from '@phosphor-icons/react';
import CalendarSection from './CalendarSection';
import GroupInfo from './GroupInfo';
import UserStatus from './UserStatus';
import './RightSidebar.css';

const RightSidebar = ({
    calendarEvents,
    user,
    isMobile,
    showMainChat
}) => {
    return (
        <div className={`right-sidebar px-2 ${isMobile && !showMainChat ? 'mobile-hidden' : ''}`}>
            <div className="video-sessions mt-2">
                <div className="video-banner">
                    <span className="play-icon">
                        <YoutubeLogo size={32} />
                    </span>
                    <span>Video Sessions</span>
                </div>
            </div>
            <CalendarSection calendarEvents={calendarEvents} />
            <GroupInfo />
            <UserStatus user={user} />
        </div>
    );
};

export default RightSidebar;

