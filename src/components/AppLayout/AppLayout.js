import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { List, X, House, User, Envelope, CalendarBlank, Bell, GearSix, SignOut, UsersThree } from '@phosphor-icons/react';
import LeftNavbar from '../../pages/GroupChat/components/LeftNavbar';
import { AuthContext } from '../../context/AuthContext';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useContext(AuthContext);
  const [activeNav, setActiveNav] = useState('messages');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    { icon: Bell, label: 'Notifications', nav: 'notifications' },
    { icon: GearSix, label: 'Settings', nav: 'settings' },
  ];

  return (
    <div className="app-layout">
      <LeftNavbar activeNav={activeNav} setActiveNav={handleNavClick} />

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
            <button
              className="hamburger-menu"
              onClick={() => setIsSidebarOpen(true)}
            >
              <List size={32} weight="bold" />
            </button>
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
    </div>
  );
};

export default AppLayout;

