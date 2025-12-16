import React, { useContext, useState, useEffect, useRef } from 'react';
import { House, User, Envelope, CalendarBlank, Bell, GearSix, SignOut } from '@phosphor-icons/react';
import './LeftNavbar.css';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { UsersThree } from '@phosphor-icons/react';
import axiosInstance from '../../../API/axiosInstance';
import NotificationPanel from './NotificationPanel';

const LeftNavbar = ({ activeNav, setActiveNav, externalNotificationPanelOpen, onExternalNotificationPanelClose, onNotificationRead }) => {
  console.log('🔔 LeftNavbar component rendering');
  const navigate = useNavigate();
  const { logoutUser } = useContext(AuthContext);
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const bellRef = useRef(null);

  // Track mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync with external notification panel state (for mobile sidebar)
  useEffect(() => {
    if (externalNotificationPanelOpen !== undefined) {
      setShowNotificationPanel(externalNotificationPanelOpen);
    }
  }, [externalNotificationPanelOpen]);

  console.log('🔔 Current unreadCount state:', unreadCount);

  // Fetch unread notification count on mount
  useEffect(() => {
    console.log('🔔 LeftNavbar mounted, fetching unread count...');
    fetchUnreadCount();
  }, []);

  // Listen for Socket.IO notification events instead of polling
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (notification) => {
      console.log('🔔 New notification received via Socket.IO in LeftNavbar:', notification);
      // Increment unread count
      setUnreadCount(prev => prev + 1);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, isConnected]);

  const fetchUnreadCount = async () => {
    console.log('🔔 fetchUnreadCount called');
    try {
      console.log('🔔 Making API call to /notification/unread-count');
      const response = await axiosInstance.get('/notification/unread-count');
      console.log('🔔 Unread count API response:', response);
      console.log('🔔 Response data:', response.data);
      console.log('🔔 Response data type:', typeof response.data);

      // Handle different response formats
      let count = 0;
      const data = response.data;

      if (data !== null && data !== undefined) {
        // Case 1: Direct number
        if (typeof data === 'number') {
          count = data;
        }
        // Case 2: { success: true, unreadCount: number } - YOUR API FORMAT
        else if (data.success && typeof data.unreadCount === 'number') {
          count = data.unreadCount;
        }
        // Case 3: { success: true, data: number }
        else if (data.success && data.data !== undefined) {
          if (typeof data.data === 'number') {
            count = data.data;
          } else if (data.data && typeof data.data.count === 'number') {
            count = data.data.count;
          } else if (data.data && typeof data.data.unread_count === 'number') {
            count = data.data.unread_count;
          } else if (data.data && typeof data.data.unreadCount === 'number') {
            count = data.data.unreadCount;
          }
        }
        // Case 4: { data: number } (without success field)
        else if (data.data !== undefined) {
          if (typeof data.data === 'number') {
            count = data.data;
          } else if (data.data && typeof data.data.count === 'number') {
            count = data.data.count;
          } else if (data.data && typeof data.data.unread_count === 'number') {
            count = data.data.unread_count;
          } else if (data.data && typeof data.data.unreadCount === 'number') {
            count = data.data.unreadCount;
          }
        }
        // Case 5: Direct properties on response.data
        else if (typeof data.unreadCount === 'number') {
          count = data.unreadCount;
        } else if (typeof data.count === 'number') {
          count = data.count;
        } else if (typeof data.unread_count === 'number') {
          count = data.unread_count;
        } else if (typeof data.unread === 'number') {
          count = data.unread;
        }
      }

      // Ensure count is a valid number
      count = Number(count) || 0;
      console.log('🔔 Final parsed unread count:', count);
      console.log('🔔 Setting unreadCount state to:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ Error fetching unread notification count:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      // Don't reset to 0 on error, keep previous count
    }
  };

  const handleBellClick = (e) => {
    e.stopPropagation();
    const wasOpen = showNotificationPanel;
    setShowNotificationPanel(!showNotificationPanel);

    // If opening the panel, immediately hide the badge (optimistic update)
    if (!wasOpen && unreadCount > 0) {
      setUnreadCount(0);
    }

    // Always refresh count when toggling
    fetchUnreadCount();
  };

  const handleNotificationClose = () => {
    setShowNotificationPanel(false);
    // If external control exists (mobile), notify parent
    if (onExternalNotificationPanelClose) {
      onExternalNotificationPanelClose();
    }
    // Refresh count after closing to get updated count
    setTimeout(() => {
      fetchUnreadCount();
    }, 300);
  };

  // Handle notification read callback - refresh count after marking as read
  const handleNotificationRead = () => {
    // Immediately set count to 0 (optimistic update)
    setUnreadCount(0);
    // Also refresh from server to ensure accuracy
    setTimeout(() => {
      fetchUnreadCount();
    }, 500);
  };

  const handleLogout = () => {
    try {
      logoutUser();
    } catch (err) {
      console.warn('Logout error', err);
    }
    navigate('/login');
  };

  // Calculate position for notification panel
  const getNotificationPanelPosition = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      // Position panel to the right of bell, vertically centered with the bell icon
      // Panel max height is 600px, so center it: bell center - half panel height
      const bellCenter = rect.top + rect.height / 2;
      const panelTop = Math.max(10, bellCenter - 300); // 300 is half of 600px max height
      return {
        top: `${panelTop}px`, // Center panel vertically with bell
        left: `${rect.right + 10}px` // Position to the right of the bell
      };
    }
    return {
      top: '80px',
      left: '90px' // Default position to the right of left navbar
    };
  };

  return (
    <>
      <div className="left-navbar rounded-4 shadow-sm">
        <div className="nav-logo">
          <div className="logo-icon">
            <img
              src="/assets/meetza_logo_1024.png"
              alt="logo"
              style={{ width: '80px', height: '80px' }}
            />
          </div>
        </div>
        <div className="nav-icons">
          <div className="nav-icons-group-top">
            <div
              className={`nav-icon ${activeNav === 'home' ? 'active' : ''}`}
              onClick={() => setActiveNav('home')}
            >
              <House size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveNav('profile')}
            >
              <User size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveNav('messages')}
            >
              <Envelope size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === 'users' ? 'active' : ''}`}
              onClick={() => setActiveNav('users')}
            >
              <UsersThree size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveNav('calendar')}
            >
              <CalendarBlank size={32} />
            </div>
          </div>
          <div className="nav-icons-group-bottom">
            <div
              ref={bellRef}
              className={`nav-icon notification-icon ${activeNav === 'notifications' ? 'active' : ''}`}
              onClick={handleBellClick}
            >
              <Bell size={32} />
              {unreadCount > 0 && (
                <span className="notification-badge" title={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div
              className={`nav-icon ${activeNav === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveNav('settings')}
            >
              <GearSix size={32} />
            </div>
            <div
              className="nav-icon logout-icon"
              title="Logout"
              onClick={handleLogout}
            >
              <SignOut size={32} />
            </div>
          </div>
        </div>
      </div>
      <NotificationPanel
        isOpen={showNotificationPanel}
        onClose={handleNotificationClose}
        position={getNotificationPanelPosition()}
        onNotificationRead={() => {
          handleNotificationRead();
          // Also call external callback if provided (for mobile header)
          if (onNotificationRead) {
            onNotificationRead();
          }
        }}
        isMobile={isMobile}
      />
    </>
  );
};

export default LeftNavbar;

