import React from 'react';
import { List, Bell } from '@phosphor-icons/react';
import './MobileHeader.css';

const MobileHeader = ({
  onOpenNotifications,
  onOpenSidebar,
  unreadNotificationCount = 0
}) => {
  // Debug: Log count changes on mobile
  React.useEffect(() => {
    console.log('📱 MobileHeader - unreadNotificationCount:', unreadNotificationCount);
  }, [unreadNotificationCount]);

  return (
    <div className="mobile-header">
      <div className="logo-section">
        <div className="logo-icon">
          <img
            src="/assets/ss.png"
            alt="logo"
          />
        </div>
        <div className="mobile-header-actions">
          {onOpenNotifications && (
            <button
              className="notification-bell-mobile"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔔 Bell clicked in right sidebar');
                if (onOpenNotifications) {
                  onOpenNotifications(e);
                }
              }}
              title="Notifications"
            >
              <Bell size={28} weight="regular" />
              {unreadNotificationCount > 0 && (
                <span className="notification-badge-mobile">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}
          {onOpenSidebar && (
            <button
              className="hamburger-menu"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🍔 Hamburger clicked in right sidebar');
                if (onOpenSidebar) {
                  onOpenSidebar(e);
                }
              }}
            >
              <List size={32} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;

