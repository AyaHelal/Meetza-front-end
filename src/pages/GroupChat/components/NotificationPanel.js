import React, { useState, useEffect, useRef, useContext } from 'react';
import axiosInstance from '../../../API/axiosInstance';
import { useSocket } from '../../../context/SocketContext';
import './NotificationPanel.css';

const NotificationPanel = ({ isOpen, onClose, position, onNotificationRead, isMobile = false }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const { socket, isConnected, getNotifications, markAllNotificationsRead,setUnreadNotificationCount } = useSocket();

  // Close panel when clicking outside (desktop only)
  useEffect(() => {
    if (isMobile) return; // Don't handle click outside on mobile full-page

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click is not on the bell icon
        if (!event.target.closest('.nav-icon.notification-icon')) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isMobile]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Mark all as read when panel closes
  useEffect(() => {
    if (!isOpen) {
      markAllAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Listen for real-time notification updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (notification) => {
      console.log('🔔 New notification received in NotificationPanel:', notification);
      // Add new notification to the list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadNotificationCount(prev => prev + 1);
    };

    const handleNotificationRead = (data) => {
      console.log('🔔 Notification read event received:', data);
      // Update notification status in the list
      if (data.notificationId) {
        setNotifications((prev) =>
          prev.map((notif) =>
            (notif.id === data.notificationId || notif.notification_id === data.notificationId)
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    };

    const handleAllNotificationsRead = () => {
      console.log('🔔 All notifications marked as read');
      // Mark all notifications as read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notification_read', handleNotificationRead);
    socket.on('all_notifications_read', handleAllNotificationsRead);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_read', handleNotificationRead);
      socket.off('all_notifications_read', handleAllNotificationsRead);
    };
  }, [socket, isConnected]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/notification');
      console.log('Notification API response:', response.data);
      setNotifications(response.data.data ||[]);
      setLoading(false);


      // Handle different response formats
      let notificationsData = [];
      if (response.data) {
        if (response.data.success && response.data.data) {
          notificationsData = Array.isArray(response.data.data) ? response.data.data : [];
        } else if (Array.isArray(response.data)) {
          notificationsData = response.data;
        } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
          notificationsData = response.data.notifications;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          notificationsData = response.data.data;
        }
      }

      console.log('Parsed notifications:', notificationsData);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error response:', error.response?.data);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
  try {
    await axiosInstance.put('/notification/mark-all-as-read');

    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );

    setUnreadNotificationCount();

    if (onNotificationRead) {
  const unreadCount = notifications.filter(n => !n.is_read).length;
  onNotificationRead(unreadCount);
}

  } catch (error) {
    console.error(error);
  }
};


  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`notification-panel ${isMobile ? 'mobile-full-page' : ''}`}
      style={isMobile ? {} : (position ? {
        top: position.top,
        left: position.left,
        right: position.right,
        bottom: position.bottom
      } : {})}
    >
      <div className="notification-panel-header">
        <h3>Notifications</h3>
        <button className="notification-close-btn" onClick={onClose}>×</button>
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
                  className={`notification-item ${isUnread ? 'unread' : 'read'}`}
                >
                  {isUnread && <div className="notification-unread-indicator"></div>}
                  <div className="notification-content">
                    <div className="notification-header">
                      <div className="notification-avatar-container">
                        {notification.administrator_photo ? (
                          <img
                            src={notification.administrator_photo}
                            alt={notification.administrator_name || 'Admin'}
                            className="notification-avatar"
                          />
                        ) : (
                          <div className="notification-avatar-fallback">
                            {getInitials(notification.administrator_name || 'A')}
                          </div>
                        )}
                        {isUnread && <div className="notification-avatar-badge"></div>}
                      </div>
                      <div className="notification-info">
                        <div className="notification-sender-row">
                          <span className="notification-sender">
                            {notification.administrator_name || 'Administrator'}
                          </span>
                          <span className="notification-time">
                            {formatDate(notification.created_at || notification.createdAt || notification.timestamp)}
                          </span>
                        </div>
                        <div className="notification-title">
                          {notification.title || 'Notification'}
                          {isUnread && <span className="notification-new-badge">New</span>}
                        </div>
                        <div className="notification-message">
                          {notification.message || notification.description || ''}
                        </div>
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

