import React, { useContext, useState, useEffect, useRef } from "react";
import {
  House,
  User,
  Envelope,
  CalendarBlank,
  Bell,
  GearSix,
  SignOut,
} from "@phosphor-icons/react";
import "./LeftNavbar.css";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { UsersThree } from "@phosphor-icons/react";
import NotificationPanel from "./NotificationPanel";

const LeftNavbar = ({
  activeNav,
  setActiveNav,
  externalNotificationPanelOpen,
  onExternalNotificationPanelClose,
  onNotificationRead,
}) => {
  console.log("🔔 LeftNavbar component rendering");
  const navigate = useNavigate();
  const { logoutUser } = useContext(AuthContext);
  const {
    socket,
    isConnected,
    unreadNotificationCount,
    setUnreadNotificationCount,
    markAllNotificationsRead,
    getUnreadNotificationCount,
  } = useSocket();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const bellRef = useRef(null);
  const hasFetchedInitialCount = useRef(false);

  // Fetch initial unread count when socket connects (via socket) - only once
  useEffect(() => {
    if (socket && isConnected && !hasFetchedInitialCount.current) {
      hasFetchedInitialCount.current = true;
      getUnreadNotificationCount((ack) => {
        if (ack && ack.ok && ack.unreadCount !== undefined) {
          console.log("🔔 Initial unread count from socket:", ack.unreadCount);
        }
      });
    }
    
    // Reset flag when socket disconnects
    if (!socket || !isConnected) {
      hasFetchedInitialCount.current = false;
    }
  }, [socket, isConnected, getUnreadNotificationCount]);

  // Socket effect to update count on new notifications
  // Note: The count is already updated in SocketContext, but we can listen here if needed
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for both event name variations (backend may use either)
    const handleNewNotification = (notification) => {
      console.log(
        "🔔 New notification received via socket in LeftNavbar:",
        notification
      );
      // Count is already updated in SocketContext, so this is just for logging
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("newNotification", handleNewNotification);
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isConnected]);

  // Track mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync with external notification panel state (for mobile sidebar)
  useEffect(() => {
    if (externalNotificationPanelOpen !== undefined) {
      setShowNotificationPanel(externalNotificationPanelOpen);
    }
  }, [externalNotificationPanelOpen]);

  const handleOpenPanel = () => {
    markAllNotificationsRead();
    setUnreadNotificationCount(0);
  };

  const handleBellClick = (e) => {
    e.stopPropagation();
    const wasOpen = showNotificationPanel;
    setShowNotificationPanel(!showNotificationPanel);

    // If opening the panel, immediately hide the badge (optimistic update)
    if (!wasOpen) {
      handleOpenPanel();
    }
  };

  const handleNotificationClose = () => {
    setShowNotificationPanel(false);
    // If external control exists (mobile), notify parent
    if (onExternalNotificationPanelClose) {
      onExternalNotificationPanelClose();
    }
  };

  const handleLogout = () => {
    try {
      logoutUser();
    } catch (err) {
      console.warn("Logout error", err);
    }
    navigate("/login");
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
        left: `${rect.right + 10}px`, // Position to the right of the bell
      };
    }
    return {
      top: "80px",
      left: "90px", // Default position to the right of left navbar
    };
  };

  console.log("🔔 unreadNotificationCount:", unreadNotificationCount);

  return (
    <>
      <div className="left-navbar rounded-4 shadow-sm">
        <div className="nav-logo">
          <div className="logo-icon">
            <img
              src="/assets/meetza_logo_1024.png"
              alt="logo"
              style={{ width: "80px", height: "80px" }}
            />
          </div>
        </div>
        <div className="nav-icons">
          <div className="nav-icons-group-top">
            <div
              className={`nav-icon ${activeNav === "home" ? "active" : ""}`}
              onClick={() => setActiveNav("home")}
            >
              <House size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === "profile" ? "active" : ""}`}
              onClick={() => setActiveNav("profile")}
            >
              <User size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === "messages" ? "active" : ""}`}
              onClick={() => setActiveNav("messages")}
            >
              <Envelope size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === "users" ? "active" : ""}`}
              onClick={() => setActiveNav("users")}
            >
              <UsersThree size={32} />
            </div>
            <div
              className={`nav-icon ${activeNav === "calendar" ? "active" : ""}`}
              onClick={() => setActiveNav("calendar")}
            >
              <CalendarBlank size={32} />
            </div>
          </div>
          <div className="nav-icons-group-bottom">
            <div
              ref={bellRef}
              className={`nav-icon notification-icon ${
                activeNav === "notifications" ? "active" : ""
              }`}
              onClick={handleBellClick}
            >
              <Bell size={32} />
              {unreadNotificationCount > 0 && (
                <span
                  className="notification-badge"
                  title={`${unreadNotificationCount} unread notification${
                    unreadNotificationCount !== 1 ? "s" : ""
                  }`}
                >
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </div>
            <div
              className={`nav-icon ${activeNav === "settings" ? "active" : ""}`}
              onClick={() => setActiveNav("settings")}
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
        onClose={handleNotificationClose}
        position={getNotificationPanelPosition()}
        onNotificationRead={() => {
          setUnreadNotificationCount(0);
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
