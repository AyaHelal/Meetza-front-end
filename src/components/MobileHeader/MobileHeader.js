import React from 'react';
import { List, Bell } from '@phosphor-icons/react';
import './MobileHeader.css';
import { useBranding } from '../../context/BrandingContext';

const MobileHeader = ({
  onOpenNotifications,
  onOpenSidebar,
  unreadNotificationCount = 0
}) => {
  const { systemName, logoUrl } = useBranding();
  const isMeetza = systemName?.trim().toLowerCase() === 'meetza';
  
  return (
    <div className="mobile-header">
      <div className="logo-section">
        <div className="logo-icon">
          <img
            src={(logoUrl && !isMeetza) ? logoUrl : "/assets/meetza_logo_1024.png"}
            alt={systemName}
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div className="mobile-header-actions">
          {onOpenNotifications && (
            <button
              className="notification-bell-mobile"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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

