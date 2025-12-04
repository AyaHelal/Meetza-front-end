import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { List, X, House, User, Envelope, CalendarBlank, Bell, GearSix, SignOut, UsersThree } from '@phosphor-icons/react';
import LeftNavbar from '../../pages/GroupChat/components/LeftNavbar';
import UserStatus from '../../pages/GroupChat/components/UserStatus';
import { AuthContext } from '../../context/AuthContext';
import axiosInstance from '../../API/axiosInstance';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useContext(AuthContext);
  const [activeNav, setActiveNav] = useState('messages');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Update activeNav based on current route
  useEffect(() => {
    if (location.pathname === '/home' || location.pathname.startsWith('/home')) {
      setActiveNav('messages');
    } else if (location.pathname === '/groups' || location.pathname.startsWith('/groups')) {
      setActiveNav('users');
    }
  }, [location]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    fetchUnreadCount();
    // Poll for unread count every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await axiosInstance.get('/notification/unread-count');
      let count = 0;
      const data = response.data;

      if (data !== null && data !== undefined) {
        if (typeof data === 'number') {
          count = data;
        } else if (data.success && typeof data.unreadCount === 'number') {
          count = data.unreadCount;
        } else if (data.success && data.data !== undefined) {
          if (typeof data.data === 'number') {
            count = data.data;
          } else if (data.data && typeof data.data.count === 'number') {
            count = data.data.count;
          } else if (data.data && typeof data.data.unread_count === 'number') {
            count = data.data.unread_count;
          } else if (data.data && typeof data.data.unreadCount === 'number') {
            count = data.data.unreadCount;
          }
        } else if (data.data !== undefined) {
          if (typeof data.data === 'number') {
            count = data.data;
          } else if (data.data && typeof data.data.count === 'number') {
            count = data.data.count;
          } else if (data.data && typeof data.data.unread_count === 'number') {
            count = data.data.unread_count;
          } else if (data.data && typeof data.data.unreadCount === 'number') {
            count = data.data.unreadCount;
          }
        } else if (typeof data.unreadCount === 'number') {
          count = data.unreadCount;
        } else if (typeof data.count === 'number') {
          count = data.count;
        } else if (typeof data.unread_count === 'number') {
          count = data.unread_count;
        } else if (typeof data.unread === 'number') {
          count = data.unread;
        }
      }

      count = Number(count) || 0;
      setUnreadNotificationCount(count);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  // Handle navigation from LeftNavbar
  const handleNavClick = (nav) => {
    // Only navigate if we're not already on that route
    if (nav === 'users' && location.pathname !== '/groups') {
      setActiveNav(nav);
      navigate('/groups', { replace: false });
    } else if (nav === 'messages' && location.pathname !== '/home') {
      setActiveNav(nav);
      navigate('/home', { replace: false });
    } else {
      // Just update active state if already on the route
      setActiveNav(nav);
    }
    setIsSidebarOpen(false);
    // Add other navigation handlers as needed
  };

  // Handle notification bell click
  const handleNotificationBellClick = () => {
    setShowNotificationPanel(true);
    setIsSidebarOpen(false);
    // Refresh count when opening
    fetchUnreadCount();
  };

  // Handle notification panel close - refresh count
  const handleNotificationPanelClose = () => {
    setShowNotificationPanel(false);
    setTimeout(() => {
      fetchUnreadCount();
    }, 300);
  };

  // Handle notification read - refresh count
  const handleNotificationRead = () => {
    fetchUnreadCount();
  };

  const handleLogout = () => {
    try {
      logoutUser();
    } catch (err) {
      console.warn('Logout error', err);
    }
    navigate('/login');
    setIsSidebarOpen(false);
  };

  const menuItems = [
    { icon: House, label: 'Home', nav: 'home' },
    { icon: User, label: 'User', nav: 'profile' },
    { icon: Envelope, label: 'Message', nav: 'messages' },
    { icon: UsersThree, label: 'Groups', nav: 'users' },
    { icon: CalendarBlank, label: 'Calendar', nav: 'calendar' },
    { icon: GearSix, label: 'Settings', nav: 'settings' },
  ];

  return (
    <div className="app-layout">
      <LeftNavbar 
        activeNav={activeNav} 
        setActiveNav={handleNavClick}
        externalNotificationPanelOpen={isMobile ? showNotificationPanel : undefined}
        onExternalNotificationPanelClose={handleNotificationPanelClose}
        onNotificationRead={handleNotificationRead}
      />

      {/* Mobile Header - Static on all pages */}
      {isMobile && (
        <div className="mobile-header">
          <div className="logo-section">
            <div className="logo-icon">
              <img
                src="/assets/ss.png"
                alt="logo"

              />
            </div>
            <div className="mobile-header-actions">
              <button
                className="notification-bell-mobile"
                onClick={handleNotificationBellClick}
                title="Notifications"
              >
                <Bell size={28} weight="regular" />
                {unreadNotificationCount > 0 && (
                  <span className="notification-badge-mobile">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              <button
                className="hamburger-menu"
                onClick={() => setIsSidebarOpen(true)}
              >
                <List size={32} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay - Mobile Only */}
      {isMobile && isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Menu - Mobile Only */}
      {isMobile && (
        <div className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          {/* Profile Section */}
          <div className="sidebar-profile">
            <button
              className="close-sidebar"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} weight="bold" />
            </button>
            <div className="profile-info">
              <div className="profile-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <h3>{user?.name || 'User'}</h3>
            </div>
          </div>

          {/* Menu Items */}
          <div className="sidebar-menu-items">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="sidebar-item"
                onClick={() => {
                  if (handleNavClick && typeof handleNavClick === 'function') {
                    handleNavClick(item.nav);
                  }
                }}
              >
                <item.icon size={24} weight="regular" />
                <span>{item.label}</span>
              </button>
            ))}
            <button
              className="sidebar-item logout-item"
              onClick={handleLogout}
            >
              <SignOut size={24} weight="regular" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <div className="app-layout-content">
        {React.cloneElement(children, {
          activeNav,
          setActiveNav: handleNavClick,
          onOpenSidebar: () => setIsSidebarOpen(true)
        })}
      </div>

      {/* Fixed UserStatus on all pages */}
      <div className="fixed-user-status">
        <UserStatus user={user} />
      </div>
    </div>
  );
};

export default AppLayout;

