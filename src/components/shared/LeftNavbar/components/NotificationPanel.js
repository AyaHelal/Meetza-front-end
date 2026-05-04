import React, { useState, useEffect, useRef, useCallback } from "react";
import axiosInstance from "../../../../API/axiosInstance";
import { useSocket } from "../../../../context/SocketContext";
import { useAuth } from "../../../../context/AuthContext";
import {
  normalizeSocketNotificationPayload,
  parseNotificationsFromApiResponse,
} from "../../../../utils/notificationSync";
import "./NotificationPanel.css";

function notificationListKey(n) {
  return String(n?.id ?? n?.notification_id ?? "");
}

/** `:id` on `PUT /group/pending/:id/status` — prefers `pendingGroupApproval.pendingGroupId` from API. */
function getGroupPendingRequestId(n) {
  // Try to get ID from pendingGroupApproval object
  const pga = n.pendingGroupApproval ?? n.pending_group_approval;
  if (pga && typeof pga === "object") {
    const pendingId =
      pga.pendingGroupId ?? pga.pending_group_id ?? pga.pendingGroupID;
    if (pendingId != null && String(pendingId).trim() !== "") {
      return String(pendingId).trim();
    }
  }

  // Try to get ID directly from notification object
  const directId = n.pendingGroupId ?? n.pending_group_id ?? n.pendingGroupID;
  if (directId != null && String(directId).trim() !== "") {
    return String(directId).trim();
  }

  // Try to get ID from nested data object
  if (n.data && typeof n.data === "object") {
    const dataId = n.data.pendingGroupId ?? n.data.pending_group_id ?? n.data.pendingGroupID;
    if (dataId != null && String(dataId).trim() !== "") {
      return String(dataId).trim();
    }
  }

  // Fallback to notification ID if no pending group ID found
  const id = n.id ?? n.notification_id;
  if (id == null || String(id).trim() === "") return "";
  return String(id).trim();
}

/** Stable row id for matching list updates (notification id, else pending group id). */
function notificationRowKey(n) {
  const idPart = notificationListKey(n);
  if (idPart) return idPart;
  const pg = getGroupPendingRequestId(n);
  if (pg) return `pg:${pg}`;
  return "";
}

const PENDING_GROUP_DECISIONS_STORAGE_KEY = "meetza:pendingGroupDecisions";

function loadPersistedPendingGroupDecisions() {
  try {
    const raw = localStorage.getItem(PENDING_GROUP_DECISIONS_STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function savePersistedPendingGroupDecisions(map) {
  try {
    localStorage.setItem(PENDING_GROUP_DECISIONS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

function persistNotifPendingDecision(notif, decision) {
  const prev = loadPersistedPendingGroupDecisions();
  const next = { ...prev };
  const rowKey = notificationRowKey(notif);
  const pg = getGroupPendingRequestId(notif);
  const nid = notificationListKey(notif);
  if (rowKey) next[rowKey] = decision;
  if (pg) next[`pg:${pg}`] = decision;
  if (nid) next[`n:${nid}`] = decision;
  savePersistedPendingGroupDecisions(next);
  return next;
}

function getStoredPendingDecision(notif, map) {
  const rowKey = notificationRowKey(notif);
  if (rowKey && map[rowKey]) return map[rowKey];
  const pg = getGroupPendingRequestId(notif);
  if (pg && map[`pg:${pg}`]) return map[`pg:${pg}`];
  const nid = notificationListKey(notif);
  if (nid && map[`n:${nid}`]) return map[`n:${nid}`];
  return null;
}

const NotificationPanel = ({
  isOpen,
  onClose,
  position,
  onNotificationRead,
  isMobile = false,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  /** Persisted in localStorage so Approved/Rejected survives refresh */
  const [pendingGroupUiDecision, setPendingGroupUiDecision] = useState(
    loadPersistedPendingGroupDecisions
  );
  const panelRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const { socket, isConnected, setUnreadNotificationCount } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Check if user is Super Admin
  const isSuperAdmin = user?.role === "Super_Admin" || user?.role === "SuperAdmin";

  const handleApprove = async (notif) => {
    const pendingGroupId = getGroupPendingRequestId(notif);
    if (!pendingGroupId) return;
    const rowKey = notificationRowKey(notif);
    if (!rowKey) return;
    try {
      await axiosInstance.put(`/group/pending/${pendingGroupId}/status`, {
        status: "1",
      });
      const decisionMap = persistNotifPendingDecision(notif, "approved");
      setPendingGroupUiDecision(decisionMap);
      setNotifications((prev) =>
        prev.map((n) =>
          notificationRowKey(n) === rowKey
            ? { ...n, status: "1", is_read: true }
            : n
        )
      );
    } catch (error) {
      console.error("❌ Error approving pending group:", error);
    }
  };

  const handleReject = async (notif) => {
    const pendingGroupId = getGroupPendingRequestId(notif);
    if (!pendingGroupId) return;
    const rowKey = notificationRowKey(notif);
    if (!rowKey) return;
    try {
      await axiosInstance.put(`/group/pending/${pendingGroupId}/status`, {
        status: "0",
      });
      const decisionMap = persistNotifPendingDecision(notif, "rejected");
      setPendingGroupUiDecision(decisionMap);
      setNotifications((prev) =>
        prev.map((n) =>
          notificationRowKey(n) === rowKey
            ? { ...n, status: "0", is_read: true }
            : n
        )
      );
    } catch (error) {
      console.error("❌ Error rejecting pending group:", error);
    }
  };

  // Close panel when clicking outside (desktop only)
  useEffect(() => {
    if (isMobile) return; // Don't handle click outside on mobile full-page

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click is not on the bell icon
        if (!event.target.closest(".nav-icon.notification-icon")) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, isMobile]);

  const fetchNotifications = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    try {
      if (!silent) setLoading(true);
      const response = await axiosInstance.get("/notification");
      const notificationsData = parseNotificationsFromApiResponse(response.data);

      setNotifications(notificationsData);
      return notificationsData;
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      console.error("❌ Error response:", error.response?.data);
      setNotifications([]);
      throw error; // Re-throw to allow caller to handle
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await axiosInstance.put("/notification/mark-all-as-read");

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);

      if (onNotificationRead) {
        onNotificationRead(0);
      }
    } catch (error) {
      console.error("❌ Failed to mark all notifications as read:", error);
      console.error("❌ Error response:", error.response?.data);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);

      if (onNotificationRead) {
        onNotificationRead(0);
      }
    }
  }, [onNotificationRead, setUnreadNotificationCount]);

  // Fetch notifications and join notification room when panel opens
  useEffect(() => {
    if (isOpen) {
      if (socket && isConnected) {
        socket.emit("join_notifications", (ack) => {
          if (ack && ack.ok) {
          }
        });
      }

      fetchNotifications().catch((error) => {
        console.error("❌ Error in fetch notifications:", error);
      });
    }
  }, [isOpen, socket, isConnected, fetchNotifications]);

  // Mark all as read when panel closes (but not on initial mount when isOpen is false)
  const hasBeenOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen) {
      hasBeenOpenRef.current = true;
    } else if (hasBeenOpenRef.current && !isOpen) {
      markAllAsRead();
    }
  }, [isOpen, markAllAsRead]);

  // Listen for real-time notification updates via socket
  useEffect(() => {
    if (!socket || !isConnected) return;

    let debounceTimer = null;

    const scheduleSilentListSync = () => {
      if (!isOpenRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchNotificationsRef.current?.({ silent: true }).catch(() => {});
      }, 320);
    };

    const handleNewNotification = (raw) => {
      const notification = normalizeSocketNotificationPayload(raw);
      if (notification && typeof notification === "object") {
        setNotifications((prev) => {
          const key = notificationListKey(notification);
          if (
            key &&
            prev.some((p) => notificationListKey(p) === key)
          ) {
            return prev;
          }
          return [notification, ...prev];
        });
      } else {
        scheduleSilentListSync();
      }
    };

    const handleNotificationRead = (data) => {
      // Update notification status in the list
      if (data.notificationId) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === data.notificationId ||
            notif.notification_id === data.notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    };

    const handleAllNotificationsRead = () => {
      // Mark all notifications as read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
    };

    const handleNotificationCountUpdate = () => {
      scheduleSilentListSync();
    };

    // Listen for both event name variations
    socket.on("newNotification", handleNewNotification);
    socket.on("new_notification", handleNewNotification);
    socket.on("notification_count_update", handleNotificationCountUpdate);
    socket.on("notification_read", handleNotificationRead);
    socket.on("all_notifications_read", handleAllNotificationsRead);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off("newNotification", handleNewNotification);
      socket.off("new_notification", handleNewNotification);
      socket.off("notification_count_update", handleNotificationCountUpdate);
      socket.off("notification_read", handleNotificationRead);
      socket.off("all_notifications_read", handleAllNotificationsRead);
    };
  }, [socket, isConnected]);

  // REST poll + catch-all socket events dispatch these window events (see SocketContext).
  useEffect(() => {
    const mergeIncoming = (notification) => {
      if (!notification || typeof notification !== "object") return;
      setNotifications((prev) => {
        const key = notificationListKey(notification);
        if (key && prev.some((p) => notificationListKey(p) === key)) return prev;
        return [notification, ...prev];
      });
    };

    const onSocketPayload = (e) => mergeIncoming(e.detail);

    const onRestSync = (e) => {
      const list = e.detail?.notifications;
      if (!isOpenRef.current || !Array.isArray(list)) return;
      setNotifications(list);
    };

    window.addEventListener("meetza:socket-notification", onSocketPayload);
    window.addEventListener("meetza:notifications-sync", onRestSync);
    return () => {
      window.removeEventListener("meetza:socket-notification", onSocketPayload);
      window.removeEventListener("meetza:notifications-sync", onRestSync);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);

    date.setHours(date.getHours() + 1);

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getInitials = (name) => {
    if (!name) return "A";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const PENDING_GROUP_APPROVAL_TITLE = "New group pending approval";

  const isNewGroupPendingApproval = (notification) => {
    const title = (notification.title || "").trim();
    if (title === PENDING_GROUP_APPROVAL_TITLE) return true;
    const pga = notification.pendingGroupApproval ?? notification.pending_group_approval;
    if (pga && typeof pga === "object") {
      const pid = pga.pendingGroupId ?? pga.pending_group_id;
      if (pid != null && String(pid).trim() !== "") return true;
    }
    return false;
  };

  const showApproveRejectForNotification = (notification) => {
    if (!isSuperAdmin || !isNewGroupPendingApproval(notification)) return false;
    const stored = getStoredPendingDecision(notification, pendingGroupUiDecision);
    if (stored === "approved" || stored === "rejected") return false;
    const status = String(notification.status ?? "").trim().toLowerCase();
    if (
      status === "approved" ||
      status === "rejected" ||
      status === "1" ||
      status === "0"
    ) {
      return false;
    }
    return true;
  };

  /** After approve/reject: same notification row shows Approved / Rejected (local UI or server status). */
  const getPendingGroupDecisionLabel = (notification) => {
    if (!isNewGroupPendingApproval(notification)) return null;
    const stored = getStoredPendingDecision(notification, pendingGroupUiDecision);
    if (stored === "approved" || stored === "rejected") return stored;
    const status = String(notification.status ?? "").trim().toLowerCase();
    if (status === "1" || status === "approved") return "approved";
    if (status === "0" || status === "rejected") return "rejected";
    return null;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`notification-panel ${isMobile ? "mobile-full-page" : ""}`}
      style={
        isMobile
          ? {}
          : position
          ? {
              top: position.top,
              left: position.left,
              right: position.right,
              bottom: position.bottom,
            }
          : {}
      }
    >
      <div className="notification-panel-header">
        <h3>Notifications</h3>
        <button className="notification-close-btn" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="notification-panel-content">
        {loading ? (
          <div className="notification-loading">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">No notifications</div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => {
              const isUnread = !notification.is_read;
              return (
                <div
                  key={notification.id || notification.notification_id}
                  className={`notification-item ${
                    isUnread ? "unread" : "read"
                  }`}
                >
                  {isUnread && (
                    <div className="notification-unread-indicator"></div>
                  )}
                  <div className="notification-content">
                    <div className="notification-header">
                      <div className="notification-avatar-container">
                        {notification.administrator_photo || notification.user_photo ? (
                          <img
                            src={notification.administrator_photo || notification.user_photo || undefined}
                            alt={notification.administrator_name || notification.sender_name || "Leader"}
                            className="notification-avatar"
                          />
                        ) : (
                          <div className="notification-avatar-fallback">
                            {getInitials(
                              notification.administrator_name || notification.sender_name || "A"
                            )}
                          </div>
                        )}
                        {isUnread && (
                          <div className="notification-avatar-badge"></div>
                        )}
                      </div>
                      <div className="notification-info">
                        <div className="notification-sender-row">
                          <span className="notification-sender">
                            {notification.administrator_name || notification.sender_name || "Leader"}
                          </span>
                          <span className="notification-time">
                            {formatDate(
                              notification.created_at ||
                                notification.createdAt ||
                                notification.timestamp
                            )}
                          </span>
                        </div>
                        <div className="notification-title">
                          {notification.title || "Notification"}
                          {isUnread && (
                            <span className="notification-new-badge">New</span>
                          )}
                        </div>
                        <div className="notification-message">
                          {notification.message ||
                            notification.description ||
                            ""}
                        </div>
                        {showApproveRejectForNotification(notification) && (
                          <div className="notification-actions">
                            <button
                              type="button"
                              className="notification-btn notification-btn-approve"
                              onClick={() => handleApprove(notification)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="notification-btn notification-btn-reject"
                              onClick={() => handleReject(notification)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {getPendingGroupDecisionLabel(notification) === "approved" && (
                          <div className="notification-pending-decision">
                            <span className="notification-status-approved">
                              Approved
                            </span>
                          </div>
                        )}
                        {getPendingGroupDecisionLabel(notification) === "rejected" && (
                          <div className="notification-pending-decision">
                            <span className="notification-status-rejected">
                              Rejected
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
