import React, { useState, useEffect, useLayoutEffect, useContext, useRef } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  X,
  House,
  User,
  Envelope,
  CalendarBlank,
  GearSix,
  SignOut,
  UsersThree,
  VideoCamera,
  YoutubeLogo,
  BookmarkSimple,
} from "@phosphor-icons/react";
import api from "../../API/axiosInstance";
import { getGroups } from "../../pages/GroupChat/services/groupChatService";
import LeftNavbar from "../../pages/GroupChat/components/LeftNavbar";
import UserStatus from "../../pages/GroupChat/components/UserStatus";
import MobileHeader from "../MobileHeader/MobileHeader";
import UserPhoto from "../UserPhoto/UserPhoto";
import { AuthContext } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { MeetingProvider } from "../../context/MeetingContext";
import { MediaProvider } from "../../context/MediaContext";
import MeetingRoom from "../../pages/Meetings/components/MeetingRoom";
import MeetingChat from "../../pages/Meetings/components/MeetingChat";
import MeetingRightSidebar from "../../pages/Meetings/components/MeetingRightSidebar";
import "../../pages/Meetings/Meetings.css";
import "./AppLayout.css";

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useContext(AuthContext);
  const {
    socket,
    isConnected,
    joinGroup,
    unreadNotificationCount,
    refreshUnreadGroupChatCount,
    setUnreadNotificationCount,
    markAllNotificationsRead,
    getUnreadNotificationCount,
  } = useSocket();
  const [activeNav, setActiveNav] = useState("messages");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const hasFetchedInitialCountRef = useRef(false);

  const syncActiveMeetingFromStorage = React.useCallback(() => {
    try {
      const mid = sessionStorage.getItem("activeMeetingId");
      const gid = sessionStorage.getItem("activeMeetingGroupId");
      setActiveMeetingId(mid || null);
      setActiveGroupId(gid || null);
    } catch {
      setActiveMeetingId(null);
      setActiveGroupId(null);
    }
  }, []);

  // Same tick as navigation after calendar/chat set sessionStorage — avoids one render without MeetingProvider (duplicate pre-join).
  useLayoutEffect(() => {
    syncActiveMeetingFromStorage();
  }, [location.pathname, location.key, syncActiveMeetingFromStorage]);

  // Sync active meeting from sessionStorage (for Return to meeting)
  useEffect(() => {
    syncActiveMeetingFromStorage();
    const interval = setInterval(syncActiveMeetingFromStorage, 500);
    return () => clearInterval(interval);
  }, [syncActiveMeetingFromStorage]);

  // Re-join all chat rooms on route + when socket connects so `message` (and global sound) works off /messages,
  // without changing useGroupChatSocket join/leave behavior.
  useEffect(() => {
    if (!socket || !isConnected || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const groups = await getGroups(api);
        if (cancelled || !Array.isArray(groups)) return;
        groups.forEach((g) => {
          const id = g?.id;
          if (id == null) return;
          joinGroup(id, () => {});
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [socket, isConnected, user, location.pathname, joinGroup]);

  // Fetch initial count when socket connects (only once)
  useEffect(() => {
    if (socket && isConnected && !hasFetchedInitialCountRef.current) {
      hasFetchedInitialCountRef.current = true;
      getUnreadNotificationCount((ack) => {
        if (ack && ack.ok && ack.unreadCount !== undefined) {
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
      setActiveNav("home");
    } else if (location.pathname === "/profile" || location.pathname.startsWith("/profile")) {
      setActiveNav("profile");
    } else if (
      location.pathname === "/messages" ||
      location.pathname.startsWith("/messages")
    ) {
      setActiveNav("messages");
    } else if (
      location.pathname === "/groups" ||
      location.pathname.startsWith("/groups")
    ) {
      setActiveNav("users");
    } else if (
      location.pathname === "/calendar" ||
      location.pathname.startsWith("/calendar")
    ) {
      setActiveNav("calendar");
    } else if (
      location.pathname === "/admin-meetings" ||
      location.pathname.startsWith("/admin-meetings")
    ) {
      setActiveNav("admin-meetings");
    } else if (
      location.pathname === "/video" ||
      location.pathname.startsWith("/video")
    ) {
      setActiveNav("videos");
    } else if (
      location.pathname === "/saved-videos" ||
      location.pathname.startsWith("/saved-videos")
    ) {
      setActiveNav("saved-videos");
    } else if (
      location.pathname === "/settings" ||
      location.pathname.startsWith("/settings")
    ) {
      setActiveNav("settings");
    }
  }, [location]);

  // Keep chat unread badge in sync when navigating around.
  useEffect(() => {
    refreshUnreadGroupChatCount?.();
  }, [location.pathname, location.key]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (nav === "home" && location.pathname !== "/home") {
      setActiveNav(nav);
      navigate("/home", { replace: false });
    } else if (nav === "profile" && location.pathname !== "/profile") {
      setActiveNav(nav);
      navigate("/profile", { replace: false });
    } else if (nav === "users" && location.pathname !== "/groups") {
      setActiveNav(nav);
      navigate("/groups", { replace: false });
    } else if (nav === "messages" && location.pathname !== "/messages") {
      setActiveNav(nav);
      navigate("/messages", { replace: false });
    } else if (nav === "calendar" && location.pathname !== "/calendar") {
      setActiveNav(nav);
      navigate("/calendar", { replace: false });
    } else if (nav === "admin-meetings" && location.pathname !== "/admin-meetings") {
      setActiveNav(nav);
      navigate("/admin-meetings", { replace: false });
    } else if (nav === "videos" && location.pathname !== "/video") {
      setActiveNav(nav);
      navigate("/video", { replace: false });
    } else if (nav === "saved-videos" && location.pathname !== "/saved-videos") {
      setActiveNav(nav);
      navigate("/saved-videos", { replace: false });
    } else if (nav === "settings" && location.pathname !== "/settings") {
      setActiveNav(nav);
      navigate("/settings", { replace: false });
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

  const handleLogout = async () => {
    try {
      const activeMeetingId = sessionStorage.getItem("activeMeetingId");
      if (activeMeetingId) {
        try {
          await api.post(`/meeting/${activeMeetingId}/leave`);
        } catch (leaveErr) {
        }
        sessionStorage.removeItem("activeMeetingId");
        sessionStorage.removeItem("activeMeetingGroupId");
      }
      logoutUser();
    } catch (err) {
    }
    navigate("/login");
    setIsSidebarOpen(false);
  };


  // Calendar: only Member and Super_Admin
  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const isAdmin = userRole.includes("administrator") || userRole.includes("super_admin") || userRole.includes("super-admin");
  const isSuperAdmin = userRole.includes("super_admin") || userRole.includes("super-admin");
  const canSeeCalendar = userRole === "member" || userRole.includes("administrator") || userRole.includes("super_admin") || userRole.includes("super-admin");

  const menuItems = [
    { icon: House, label: "Home", nav: "home" },
    ...(!isSuperAdmin ? [{ icon: User, label: "Profile", nav: "profile" }] : []),
    { icon: Envelope, label: "Message", nav: "messages" },
    { icon: UsersThree, label: "Groups", nav: "users" },
    ...(canSeeCalendar ? [{ icon: CalendarBlank, label: "Calendar", nav: "calendar" }] : []),
    { icon: YoutubeLogo, label: "Videos", nav: "videos" },
    { icon: BookmarkSimple, label: "Saved Videos", nav: "saved-videos" },
    ...(isAdmin ? [{ icon: VideoCamera, label: "Leader Meetings", nav: "admin-meetings" }] : []),
    { icon: GearSix, label: "Settings", nav: "settings" },
  ];

  const isVideoSectionActive =
    location.pathname === "/messages" && location.hash === "#video-sessions";

  return (
    <MediaProvider>
      <div
        className={`app-layout ${isVideoSectionActive ? "app-layout--video-section" : ""}`}
      >
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
                      allowUpload={false}
                    />
                  {activeMeetingId && location.pathname !== "/meetings" && (
                    <button
                      type="button"
                      className="sidebar-return-to-meeting"
                      onClick={() => {
                        navigate("/meetings", {
                          state: { meetingId: activeMeetingId, groupId: activeGroupId || null },
                        });
                        setIsSidebarOpen(false);
                      }}
                      aria-label="Return to meeting"
                    >
                      <VideoCamera size={18} weight="fill" />
                      <span>Return to meeting</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Menu Items */}
              <div className="sidebar-menu-items">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    className={`sidebar-item ${activeNav === item.nav ? "active" : ""
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

        {activeMeetingId ? (
          <MeetingProvider>
            {/* One MeetingRoom: route /meetings renders it via <Outlet /> (Meetings.js). When away, keep a hidden copy so media/socket stay alive. */}
            {location.pathname !== "/meetings" && (
              <div
                className="app-layout-content"
                style={{ display: "none" }}
                aria-hidden
              >
                <div className="meetings-container">
                  <div className="meetings-center">
                    <MeetingRoom />
                    <MeetingChat />
                  </div>
                  <MeetingRightSidebar />
                </div>
              </div>
            )}
            <div className="app-layout-content">
              <Outlet />
            </div>
            {!isMobile && (
              <div className="fixed-user-status">
                <UserStatus user={user} activeMeetingId={activeMeetingId} activeGroupId={activeGroupId} />
              </div>
            )}
          </MeetingProvider>
        ) : (
          <>
            <div className="app-layout-content">
              <Outlet />
            </div>
            {!isMobile && (
              <div className="fixed-user-status">
                <UserStatus user={user} activeMeetingId={activeMeetingId} activeGroupId={activeGroupId} />
              </div>
            )}
          </>
        )}
      </div>
    </MediaProvider>
  );
};

export default AppLayout;
