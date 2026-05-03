import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../../context/SocketContext";
import { AuthContext } from "../../../../context/AuthContext";
import api from "../../../../API/axiosInstance";
import * as meetingService from "../../../../pages/Meetings/services/meetingService";

export const useLeftNavbar = (externalNotificationPanelOpen, onExternalNotificationPanelClose) => {
  const navigate = useNavigate();
  const { logoutUser } = useContext(AuthContext);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const bellRef = useRef(null);
  const hasFetchedInitialCount = useRef(false);

  const {
    socket,
    isConnected,
    unreadNotificationCount,
    unreadGroupChatCount,
    refreshUnreadGroupChatCount,
    setUnreadNotificationCount,
    markAllNotificationsRead,
    getUnreadNotificationCount,
  } = useSocket();

  // Sync with external notification panel state (mobile sidebar)
  useEffect(() => {
    if (externalNotificationPanelOpen !== undefined) {
      setShowNotificationPanel(externalNotificationPanelOpen);
    }
  }, [externalNotificationPanelOpen]);

  // Track mobile state
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initial count fetch
  useEffect(() => {
    if (socket && isConnected && !hasFetchedInitialCount.current) {
      hasFetchedInitialCount.current = true;
      getUnreadNotificationCount((ack) => {
        if (ack && ack.ok && ack.unreadCount !== undefined) {
          // Count updated in Context
        }
      });
    }
    if (!socket || !isConnected) hasFetchedInitialCount.current = false;
  }, [socket, isConnected, getUnreadNotificationCount]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      const activeMeetingId = sessionStorage.getItem("activeMeetingId");
      if (activeMeetingId) {
        await meetingService.leaveMeeting(api, activeMeetingId);
        sessionStorage.removeItem("activeMeetingId");
      }
      logoutUser();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      logoutUser();
      navigate("/login");
    }
  };

  const toggleNotificationPanel = (e) => {
    if (e) e.stopPropagation();
    const wasOpen = showNotificationPanel;
    const newState = !wasOpen;
    
    setShowNotificationPanel(newState);

    if (newState) {
      markAllNotificationsRead();
      setUnreadNotificationCount(0);
    }
  };

  const closeNotificationPanel = () => {
    setShowNotificationPanel(false);
    if (onExternalNotificationPanelClose) {
      onExternalNotificationPanelClose();
    }
  };

  return {
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
  };
};
