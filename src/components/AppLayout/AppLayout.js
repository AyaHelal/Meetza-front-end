import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LeftNavbar from '../../pages/GroupChat/components/LeftNavbar';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('messages');

  // Update activeNav based on current route
  useEffect(() => {
    if (location.pathname === '/home' || location.pathname.startsWith('/home')) {
      setActiveNav('messages');
    } else if (location.pathname === '/groups' || location.pathname.startsWith('/groups')) {
      setActiveNav('users');
    }
  }, [location]);

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
    // Add other navigation handlers as needed
  };

  return (
    <div className="app-layout">
      <LeftNavbar activeNav={activeNav} setActiveNav={handleNavClick} />
      <div className="app-layout-content">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;

