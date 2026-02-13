import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  X,
  House,
  User,
  Envelope,
  CalendarBlank,
  GearSix,
  SignOut,
  UsersThree,
  Plus,
} from "@phosphor-icons/react";
import LeftNavbar from "../../pages/GroupChat/components/LeftNavbar";
import UserStatus from "../../pages/GroupChat/components/UserStatus";
import FloatingMeetingTile from "../../pages/GroupChat/components/FloatingMeetingTile";
import MobileHeader from "../MobileHeader/MobileHeader";
import UserPhoto from "../UserPhoto/UserPhoto";
import { AuthContext } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import "./AppLayout.css";

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useContext(AuthContext);
  const { socket, isConnected, unreadNotificationCount, setUnreadNotificationCount, markAllNotificationsRead, getUnreadNotificationCount} = useSocket();
  const [activeNav, setActiveNav] = useState("messages");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const hasFetchedInitialCountRef = useRef(false);

  // Fetch initial count when socket connects (only once)
  useEffect(() => {
    if (socket && isConnected && !hasFetchedInitialCountRef.current) {
      hasFetchedInitialCountRef.current = true;
      getUnreadNotificationCount((ack) => {
        if (ack && ack.ok && ack.unreadCount !== undefined) {
          console.log("🔔 AppLayout - Fetched initial notification count:", ack.unreadCount);
        }
      });
    }
    
    // Reset flag when socket disconnects
    if (!socket || !isConnected) {
      hasFetchedInitialCountRef.current = false;
    }
  }, [socket, isConnected, getUnreadNotificationCount]);


  // Update activeNav based on current route
  useEffect(() => {
    if (
      location.pathname === "/home" ||
      location.pathname.startsWith("/home")
    ) {
      setActiveNav("messages");
    } else if (
      location.pathname === "/groups" ||
      location.pathname.startsWith("/groups")
    ) {
      setActiveNav("users");
    }
  }, [location]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for custom events from child components (like GroupChat)
  useEffect(() => {
    const handleOpenSidebar = () => {
      setIsSidebarOpen(true);
      setShowNotificationPanel(false);
    };

    const handleOpenNotifications = () => {
      setShowNotificationPanel(true);
      setIsSidebarOpen(false);
    };

    window.addEventListener("openMobileSidebar", handleOpenSidebar);
    window.addEventListener("openNotificationPanel", handleOpenNotifications);

    return () => {
      window.removeEventListener("openMobileSidebar", handleOpenSidebar);
      window.removeEventListener(
        "openNotificationPanel",
        handleOpenNotifications
      );
    };
  }, [setUnreadNotificationCount]);


  // Handle navigation from LeftNavbar
  const handleNavClick = (nav) => {
    // Only navigate if we're not already on that route
    if (nav === "users" && location.pathname !== "/groups") {
      setActiveNav(nav);
      navigate("/groups", { replace: false });
    } else if (nav === "messages" && location.pathname !== "/home") {
      setActiveNav(nav);
      navigate("/home", { replace: false });
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
    setUnreadNotificationCount(0);
  };

  // Handle notification panel close - refresh count
  const handleNotificationPanelClose = () => {
    setShowNotificationPanel(false);
  };

  // Handle notification read - refresh count
  const handleNotificationRead = () => {
    setUnreadNotificationCount(0);
  };

  const handleLogout = () => {
    try {
      logoutUser();
    } catch (err) {
      console.warn("Logout error", err);
    }
    navigate("/login");
    setIsSidebarOpen(false);
  };


  const menuItems = [
    { icon: House, label: "Home", nav: "home" },
    { icon: User, label: "User", nav: "profile" },
    { icon: Envelope, label: "Message", nav: "messages" },
    { icon: UsersThree, label: "Groups", nav: "users" },
    { icon: CalendarBlank, label: "Calendar", nav: "calendar" },
    { icon: GearSix, label: "Settings", nav: "settings" },
  ];

  return (
    <div className="app-layout">
      <LeftNavbar
        activeNav={activeNav}
        setActiveNav={handleNavClick}
        externalNotificationPanelOpen={
          isMobile ? showNotificationPanel : undefined
        }
        onExternalNotificationPanelClose={handleNotificationPanelClose}
        onNotificationRead={handleNotificationRead}
      />

      {/* Mobile Header - Static on all pages */}
      {isMobile && (
        <MobileHeader
          onOpenNotifications={handleNotificationBellClick}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          unreadNotificationCount={unreadNotificationCount}
        />
      )}

      {/* Overlay and Sidebar - Mobile Only */}
      {isMobile && (
        <div
          className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className={`mobile-sidebar ${isSidebarOpen ? "open" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Section */}
            <div className="sidebar-profile">
              <button
                className="close-sidebar"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X size={20} weight="bold" />
              </button>
              <div className="profile-info">
                <UserPhoto 
                  user={user} 
                  variant="sidebar" 
                  size="large"
                  showName={true}
                  className="sidebar-user-photo"
                />
              </div>
            </div>

            {/* Menu Items */}
            <div className="sidebar-menu-items">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className={`sidebar-item ${
                    activeNav === item.nav ? "active" : ""
                  }`}
                  onClick={() => {
                    if (handleNavClick && typeof handleNavClick === "function") {
                      handleNavClick(item.nav);
                    }
                  }}
                >
                  <item.icon size={24} weight="regular" />
                  <span>{item.label}</span>
                </button>
              ))}
              <button className="sidebar-item logout-item" onClick={handleLogout}>
                <SignOut size={24} weight="regular" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-layout-content">
        {React.cloneElement(children, {
          activeNav,
          setActiveNav: handleNavClick,
          onOpenSidebar: () => setIsSidebarOpen(true),
        })}
      </div>

      {/* Fixed UserStatus on all pages - Hidden on mobile */}
      {!isMobile && (
        <div className="fixed-user-status">
          <UserStatus user={user} />
        </div>
      )}

      {/* Floating meeting tile - shows when in meeting and not on meeting page */}
      {location.pathname !== "/meetings" && <FloatingMeetingTile />}
    </div>
  );
};

export default AppLayout;
