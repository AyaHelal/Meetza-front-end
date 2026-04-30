import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, House, ArrowLeft } from '@phosphor-icons/react';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Hide chatbot orb on this page
    const orb = document.querySelector('.robot-orb-container');
    if (orb) orb.style.display = 'none';
    
    return () => {
      // Show it again when leaving
      if (orb) orb.style.display = 'flex';
    };
  }, []);

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="ghost-wrapper">
          <Ghost size={120} weight="duotone" className="ghost-icon" />
          <div className="ghost-shadow"></div>
        </div>
        
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Oops! Page Not Found</h2>
        <p className="not-found-text">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <div className="not-found-actions">
          <button 
            className="action-btn primary-btn" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} weight="bold" />
            Go Back
          </button>
        </div>
      </div>
      
      <div className="background-decoration">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
    </div>
  );
};

export default NotFound;
