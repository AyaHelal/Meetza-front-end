import React, { useRef, useEffect } from 'react';
import { YoutubeLogo, List } from '@phosphor-icons/react';
import CalendarSection from './CalendarSection';
import GroupInfo from './GroupInfo';
import UserStatus from './UserStatus';
import './RightSidebar.css';

const RightSidebar = ({
    groupInfo,
    calendarEvents,
    user,
    isMobile,
    showMainChat,
    expandedSection,
    setExpandedSection,
    showMobile,
    onCloseMobile,
    onOpenSidebar,
    activeSection,
    onSelectSection,
    contentSummary,
    mediaSummary,
    memberCount
}) => {
    const sidebarRef = useRef(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    useEffect(() => {
        if (!isMobile || !showMobile || !sidebarRef.current) return;

        const sidebar = sidebarRef.current;

        const handleTouchStart = (e) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            if (!touchStartX.current || !touchStartY.current) return;

            const touchCurrentX = e.touches[0].clientX;
            const touchCurrentY = e.touches[0].clientY;
            const diffX = touchCurrentX - touchStartX.current;
            const diffY = touchCurrentY - touchStartY.current;

            // Only handle horizontal swipe (ignore vertical scrolling)
            if (Math.abs(diffX) > Math.abs(diffY) && diffX > 50) {
                // Swipe right to close
                e.preventDefault();
                onCloseMobile();
            }
        };

        sidebar.addEventListener('touchstart', handleTouchStart);
        sidebar.addEventListener('touchmove', handleTouchMove);

        return () => {
            sidebar.removeEventListener('touchstart', handleTouchStart);
            sidebar.removeEventListener('touchmove', handleTouchMove);
        };
    }, [isMobile, showMobile, onCloseMobile]);

    return (
        <>
            {/* Overlay for mobile */}
            {isMobile && showMobile && (
                <div
                    className="right-sidebar-overlay"
                    onClick={onCloseMobile}
                />
            )}
            <div
                ref={sidebarRef}
                className={`right-sidebar px-2 ${isMobile && !showMainChat && !showMobile ? 'mobile-hidden' : ''} ${isMobile && showMobile ? 'mobile-visible' : ''}`}
            >
                {isMobile && showMobile && (
                    <div className="right-sidebar-mobile-header">
                        <div className="logo-section">
                            <div className="logo-icon">
                                <img
                                    src="/assets/ss.png"
                                    alt="logo"
                                />
                            </div>
                            {onOpenSidebar && (
                                <button
                                    className="hamburger-menu"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenSidebar();
                                    }}
                                >
                                    <List size={32} weight="bold" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="video-sessions mt-2">
                    <div className="video-banner">
                        <span className="play-icon">
                            <YoutubeLogo size={32} />
                        </span>
                        <span>Video Sessions</span>
                    </div>
                </div>
                <CalendarSection calendarEvents={calendarEvents} />
                <GroupInfo
                    groupInfo={groupInfo}
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                    activeSection={activeSection}
                    onSelectSection={onSelectSection}
                    contentSummary={contentSummary}
                    mediaSummary={mediaSummary}
                    memberCount={memberCount}
                    isMobile={isMobile}
                    onCloseMobile={onCloseMobile}
                />
                <UserStatus user={user} />
            </div>
        </>
    );
};

export default RightSidebar;
