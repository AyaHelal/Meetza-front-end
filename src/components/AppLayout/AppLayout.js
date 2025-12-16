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
import MobileHeader from "../MobileHeader/MobileHeader";
import { AuthContext } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import axiosInstance from "../../API/axiosInstance";
import { smartToast } from "../../API/toastManager";
import "./AppLayout.css";

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser, loginUser } = useContext(AuthContext);
  const { unreadNotificationCount, setUnreadNotificationCount, markAllNotificationsRead} = useSocket();
  const [activeNav, setActiveNav] = useState("messages");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

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
    if (typeof markAllNotificationsRead === "function") {
    markAllNotificationsRead((ack) => {
      if (!ack?.ok) console.warn("Failed to mark notifications as read on server");
    });
  }
  };

  // Handle notification panel close - refresh count
  const handleNotificationPanelClose = () => {
    setShowNotificationPanel(false);
  };

  // Handle notification read - refresh count
  const handleNotificationRead = () => {
    setUnreadNotificationCount(0);
    if (typeof markAllNotificationsRead === "function") {
    markAllNotificationsRead((ack) => {
      if (!ack?.ok) console.warn("Failed to mark notifications as read on server");
    });
  }
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

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      smartToast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      smartToast.error("Image size should be less than 5MB");
      return;
    }

    const userId = user?.id;
    if (!userId) {
      smartToast.error("User ID not found");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("user_photo", file);

      const response = await axiosInstance.patch(`/user/${userId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data) {
        // Try different possible field names and nested structures for the photo URL
        let photoUrl =
          response.data.user_photo ||
          response.data.photo ||
          response.data.data?.user_photo ||
          response.data.data?.photo ||
          response.data.user?.user_photo ||
          response.data.user?.photo ||
          response.data.profile_photo ||
          response.data.avatar;

        // Update user in context with the photo URL from PATCH response
        const updatedUser = {
          ...user,
          photo: photoUrl || user?.photo,
          user_photo: photoUrl || user?.user_photo,
        };

        // Get token from storage
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const rememberMe = localStorage.getItem("remember") === "true";

        // Update user in context
        loginUser(updatedUser, token, rememberMe);

        smartToast.success("Profile photo updated successfully");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      smartToast.error(
        error?.response?.data?.message || "Failed to upload photo"
      );
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

      {/* Overlay - Mobile Only */}
      {isMobile && isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Menu - Mobile Only */}
      {isMobile && (
        <div className={`mobile-sidebar ${isSidebarOpen ? "open" : ""}`}>
          {/* Profile Section */}
          <div className="sidebar-profile">
            <button
              className="close-sidebar"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} weight="bold" />
            </button>
            <div className="profile-info">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
                disabled={isUploadingPhoto}
              />
              <div
                className="profile-avatar-container"
                onClick={handlePhotoClick}
                style={{ cursor: isUploadingPhoto ? "wait" : "pointer" }}
                title={
                  isUploadingPhoto ? "Uploading..." : "Click to change photo"
                }
              >
                <div className="profile-avatar">
                  {(() => {
                    const userPhoto =
                      user?.photo || user?.user_photo || user?.profile_photo;

                    return userPhoto ? (
                      <img
                        src={userPhoto}
                        alt={user?.name || "User"}
                        className="profile-avatar-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                          const span =
                            e.target.parentElement.querySelector("span");
                          if (span) span.style.display = "flex";
                        }}
                      />
                    ) : null;
                  })()}
                  <span
                    style={{
                      display:
                        user?.photo || user?.user_photo || user?.profile_photo
                          ? "none"
                          : "flex",
                    }}
                  >
                    {isUploadingPhoto
                      ? "..."
                      : user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="profile-avatar-overlay">
                  <Plus size={18} weight="bold" />
                </div>
                {isUploadingPhoto && (
                  <div className="profile-avatar-loading">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
              <h3>{user?.name || "User"}</h3>
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
    </div>
  );
};

export default AppLayout;
