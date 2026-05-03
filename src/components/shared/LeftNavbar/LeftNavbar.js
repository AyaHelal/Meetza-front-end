import React, { useContext } from "react";
import {
  House,
  User,
  Envelope,
  CalendarBlank,
  Bell,
  GearSix,
  SignOut,
  VideoCamera,
  YoutubeLogo as YoutubeLogoIcon,
  BookmarkSimple,
  UsersThree
} from "@phosphor-icons/react";
import "./LeftNavbar.css";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { useBranding } from "../../../context/BrandingContext";
import NotificationPanel from "./components/NotificationPanel";

// New Hooks and Utilities
import { useLeftNavbar } from "./hooks/useLeftNavbar";
import { getUserPermissions, getNotificationPanelPosition } from "./utils/navbarUtils";

const LeftNavbar = ({
  activeNav,
  setActiveNav,
  externalNotificationPanelOpen,
  onExternalNotificationPanelClose,
  onNotificationRead,
}) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { systemName, logoUrl } = useBranding();
  
  // Custom Hook for State & Socket Logic
  const {
    showNotificationPanel,
    isMobile,
    bellRef,
    unreadNotificationCount,
    unreadGroupChatCount,
    refreshUnreadGroupChatCount,
    setUnreadNotificationCount,
    handleLogout,
    toggleNotificationPanel,
    closeNotificationPanel,
  } = useLeftNavbar(externalNotificationPanelOpen, onExternalNotificationPanelClose);

  // Utility for Permissions
  const { isAdmin, isSuperAdmin, canSeeCalendar } = getUserPermissions(user);
  
  const isMeetza = systemName?.trim().toLowerCase() === 'meetza';

  return (
    <>
      <div className="left-navbar rounded-4 shadow-sm">
        <div className="nav-logo">
          <div className="logo-icon">
            <img
              src={(logoUrl && !isMeetza) ? logoUrl : "/assets/meetza_logo_1024.png"}
              alt={systemName}
              style={{ 
                width: isMeetza ? "80px" : "50px", 
                height: isMeetza ? "80px" : "50px", 
                objectFit: "contain" 
              }}
            />
          </div>
        </div>
        
        <div className="nav-icons">
          <div className="nav-icons-group-top">
            <div
              className={`nav-icon ${activeNav === "home" ? "active" : ""}`}
              onClick={() => { navigate("/home"); setActiveNav("home"); }}
              title="Home"
            >
              <House size={32} />
            </div>
            
            {!isSuperAdmin && (
              <div
                className={`nav-icon ${activeNav === "profile" ? "active" : ""}`}
                onClick={() => { navigate("/profile"); setActiveNav("profile"); }}
                title="Profile"
              >
                <User size={32} />
              </div>
            )}
            
            <div
              className={`nav-icon ${activeNav === "messages" ? "active" : ""}`}
              onClick={() => {
                navigate("/messages");
                setActiveNav("messages");
                refreshUnreadGroupChatCount?.();
              }}
              title="Messages"
            >
              <Envelope size={32} />
              {unreadGroupChatCount > 0 && (
                <span className="nav-badge">
                  {unreadGroupChatCount > 99 ? "99+" : unreadGroupChatCount}
                </span>
              )}
            </div>
            
            <div
              className={`nav-icon ${activeNav === "users" ? "active" : ""}`}
              onClick={() => setActiveNav("users")}
              title="Groups"
            >
              <UsersThree size={32} />
            </div>
            
            {canSeeCalendar && (
              <div
                className={`nav-icon ${activeNav === "calendar" ? "active" : ""}`}
                onClick={() => setActiveNav("calendar")}
                title="Calendar"
              >
                <CalendarBlank size={32} />
              </div>
            )}
            
            <div
              className={`nav-icon ${activeNav === "videos" ? "active" : ""}`}
              onClick={() => { navigate("/video"); setActiveNav("videos"); }}
              title="Videos"
            >
              <YoutubeLogoIcon size={32} />
            </div>
            
            <div
              className={`nav-icon ${activeNav === "saved-videos" ? "active" : ""}`}
              onClick={() => { navigate("/saved-videos"); setActiveNav("saved-videos"); }}
              title="Saved videos"
            >
              <BookmarkSimple size={32} />
            </div>
            
            {isAdmin && (
              <div
                className={`nav-icon ${activeNav === "admin-meetings" ? "active" : ""}`}
                onClick={() => { navigate("/admin-meetings"); setActiveNav("admin-meetings"); }}
                title="Admin Meetings"
              >
                <VideoCamera size={32} />
              </div>
            )}
          </div>

          <div className="nav-icons-group-bottom">
            <div
              ref={bellRef}
              className={`nav-icon notification-icon ${activeNav === "notifications" ? "active" : ""}`}
              onClick={toggleNotificationPanel}
            >
              <Bell size={32} />
              {unreadNotificationCount > 0 && (
                <span className="notification-badge">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
            </div>
            
            <div
              className={`nav-icon ${activeNav === "settings" ? "active" : ""}`}
              onClick={() => setActiveNav("settings")}
              title="Settings"
            >
              <GearSix size={32} />
            </div>
            
            <div
              className="nav-icon logout-icon"
              title="Logout"
              onClick={handleLogout}
            >
              <SignOut size={32} style={{ color: "red" }} />
            </div>
          </div>
        </div>
      </div>

      <NotificationPanel
        isOpen={showNotificationPanel}
        onClose={closeNotificationPanel}
        position={getNotificationPanelPosition(bellRef)}
        onNotificationRead={() => {
          setUnreadNotificationCount(0);
          if (onNotificationRead) onNotificationRead();
        }}
        isMobile={isMobile}
      />
    </>
  );
};

export default LeftNavbar;
