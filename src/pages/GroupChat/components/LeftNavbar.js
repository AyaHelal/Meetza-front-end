import React, { useContext } from 'react';
import { House, User, Envelope, CalendarBlank, Bell, GearSix, SignOut } from '@phosphor-icons/react';
import './LeftNavbar.css';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';

const LeftNavbar = ({ activeNav, setActiveNav }) => {
  const navigate = useNavigate();
  const { logoutUser } = useContext(AuthContext);

  const handleLogout = () => {
    try {
      logoutUser();
    } catch (err) {
      console.warn('Logout error', err);
    }
    navigate('/login');
  };
  return (
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
            className={`nav-icon ${activeNav === 'calendar' ? 'active' : ''}`} 
            onClick={() => setActiveNav('calendar')}
          >
            <CalendarBlank size={32} />
          </div>
        </div>
        <div className="nav-icons-group-bottom">
          <div 
            className={`nav-icon ${activeNav === 'notifications' ? 'active' : ''}`} 
            onClick={() => setActiveNav('notifications')}
          >
            <Bell size={32} />
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
  );
};

export default LeftNavbar;

