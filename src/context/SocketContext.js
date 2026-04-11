import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";
import api from "../API/axiosInstance";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const hasLoggedSocketErrorRef = useRef(false);
  const lastTokenRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  // Use environment variable or default to ngrok URL
  // Socket.io connects at root, not /api, so remove /api suffix if present
  const apiUrl = process.env.REACT_APP_SOCKET_URL || " http://localhost:4000";
  const SERVER_URL = apiUrl.replace(/\/api$/, '');

  useEffect(() => {
    // Clear any pending connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Only connect if we have a token
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      lastTokenRef.current = null;
      return;
    }

    // If token hasn't changed, don't reconnect
    if (lastTokenRef.current === token && socketRef.current && isConnected) {
      return;
    }

    // If token changed but socket exists, disconnect first
    if (socketRef.current && lastTokenRef.current !== token) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    // Store current token
    lastTokenRef.current = token;

    // Add a small delay to prevent rapid reconnections (especially after Google login)
    connectionTimeoutRef.current = setTimeout(() => {
      // Double-check token is still valid before connecting
      if (!token || lastTokenRef.current !== token) {
        return;
      }

      // Disconnect existing socket if still exists
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }


      // Create socket connection with authentication
      const newSocket = io(SERVER_URL, {
        auth: {
          token: token, // JWT token is required for authentication
        },
        transports: ["websocket", "polling"], // fallback options
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
      });

      // Connection successful
      newSocket.on("connect", () => {
        setIsConnected(true);

        // Join notification room (backend does this automatically, but we can also explicitly join)
        newSocket.emit("join_notifications", (ack) => {
          if (ack && ack.ok) {
          }
        });

        // Get initial unread notification count after socket connects
        // Use REST API directly since socket event doesn't seem to work reliably
        setTimeout(() => {
          api.get("/notification")
            .then((response) => {
              let notificationsData = [];
              if (response.data) {
                if (response.data.success && response.data.data) {
                  notificationsData = Array.isArray(response.data.data) ? response.data.data : [];
                } else if (Array.isArray(response.data)) {
                  notificationsData = response.data;
                } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
                  notificationsData = response.data.notifications;
                }
              }
              const unreadCount = notificationsData.filter(n => !n.is_read && n.is_read !== true).length;
              setUnreadNotificationCount(unreadCount);
            })
            .catch((error) => {
            });
        }, 500);

        setConnectionError(null);
        hasLoggedSocketErrorRef.current = false;
      });

      // Listen for new notifications (emitted to the user's notification room)
      newSocket.on("newNotification", (notification) => {
        setUnreadNotificationCount((prevCount) => {
          const newCount = prevCount + 1;
          return newCount;
        });
      });

      // Also listen for 'new_notification' event name (backup)
      newSocket.on("new_notification", (notification) => {
        setUnreadNotificationCount((prevCount) => {
          const newCount = prevCount + 1;
          return newCount;
        });
      });

      // Listen for notification_count_update event (backend sends the actual count)
      newSocket.on("notification_count_update", (data) => {
        // data can be an array with count, or an object with count property
        const count = Array.isArray(data) && data[0]?.unreadCount !== undefined
          ? data[0].unreadCount
          : (data?.unreadCount !== undefined ? data.unreadCount : (typeof data === 'number' ? data : null));


        if (count !== null && count !== undefined) {
          setUnreadNotificationCount(count);
        } else {
          // If count is not provided, increment (fallback behavior)
          setUnreadNotificationCount((prevCount) => {
            const newCount = prevCount + 1;
            return newCount;
          });
        }
      });

      // Connection error
      newSocket.on("connect_error", (error) => {
        setIsConnected(false);
        setConnectionError(error.message);

        if (!hasLoggedSocketErrorRef.current) {
          console.error("❌ Socket connection error:", error.message);
          console.error("❌ Attempted URL:", SERVER_URL);

          if (
            error.message.includes("websocket") ||
            error.message.includes("WebSocket")
          ) {
          }

          hasLoggedSocketErrorRef.current = true;
        }
      });


      // Disconnected
      newSocket.on("disconnect", (reason) => {
        setIsConnected(false);
        // Remove all notification listeners on disconnect
        newSocket.off("newNotification");
        newSocket.off("new_notification");
        newSocket.off("notification_count_update");
      });

      // Reconnection attempt
      newSocket.on("reconnect_attempt", (attemptNumber) => {
      });

      // Reconnection successful
      newSocket.on("reconnect", (attemptNumber) => {
        setIsConnected(true);
        setConnectionError(null);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }, 300); // 300ms delay to prevent rapid reconnections after Google login

    // Cleanup on unmount or token change
    return () => {
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);



  // Helper function to emit events with error handling
  const emit = (event, data, callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit(event, data, callback);
  };

  // Helper function to join a group
  const joinGroup = (groupId, callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("joinGroup", { groupId: groupId }, (ack) => {
      if (ack && ack.ok) {
      } else {
        console.error(
          `❌ Failed to join group ${groupId}:`,
          ack?.message || "Unknown error"
        );
      }
      if (callback) callback(ack);
    });
  };

  // Helper function to leave a group
  const leaveGroup = (groupId) => {
    if (!socket || !isConnected) {
      return;
    }

    socket.emit("leaveGroup", { groupId: groupId });
  };

  // Helper function to send a message (optional `options.parentMessageId` for replies)
  const sendMessage = (groupId, message, callback, options) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    const opts = options && typeof options === "object" ? options : {};
    const parentMessageId =
      opts.parentMessageId != null && opts.parentMessageId !== ""
        ? opts.parentMessageId
        : undefined;
    const payload = {
      groupId,
      message,
      ...(parentMessageId !== undefined ? { parentMessageId } : {}),
    };

    socket.emit("sendMessage", payload, (ack) => {
      if (ack && ack.ok) {
      } else {
        console.error(
          "❌ Failed to send message:",
          ack?.message || "Unknown error"
        );
      }
      if (callback) callback(ack);
    });
  };

  // Helper function to mark message as read
  const markMessageRead = (groupId, messageId, callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("markMessageRead", { groupId, messageId }, (ack) => {
      if (callback) callback(ack);
    });
  };

  // Helper function to mark all messages as read (memoized to prevent re-renders)
  const markAllMessagesRead = useCallback((groupId, callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("markAllMessagesRead", { groupId }, (ack) => {
      if (callback) callback(ack);
    });
  }, [socket, isConnected]);

  // Helper function to get unread count
  const getUnreadCount = (groupId, callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({
          ok: false,
          message: "Socket not connected",
          unreadCount: 0,
        });
      }
      return;
    }

    socket.emit("getUnreadCount", { groupId }, (ack) => {
      if (callback) callback(ack);
    });
  };

  // Helper function to get notifications
  const getNotifications = (callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({
          ok: false,
          message: "Socket not connected",
          notifications: [],
        });
      }
      return;
    }

    socket.emit("getNotifications", {}, (ack) => {
      if (callback) callback(ack);
    });
  };

  // Helper function to mark notification as read
  const markNotificationRead = (notificationId, callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("markNotificationRead", { notificationId }, (ack) => {
      if (callback) callback(ack);
    });
  };

  // Helper function to mark all notifications as read (memoized to prevent re-renders)
  const markAllNotificationsRead = useCallback(async (callback) => {
    if (!socket || !isConnected) {
      // Since socket is not connected, we can't mark notifications as read
      // Just reset the local count to 0 as optimistic update
      setUnreadNotificationCount(0);
      if (callback) callback({ ok: false, message: "Socket not connected" });
      return;
    }

    socket.emit("markAllNotificationsRead", {}, (ack) => {
      if (ack && ack.ok) {
        // Reset count to 0 since all are marked as read
        setUnreadNotificationCount(0);
      }
      if (callback) callback(ack);
    });
  }, [socket, isConnected]);

  // Helper function to get unread notification count via socket (memoized to prevent re-renders)
  const getUnreadNotificationCount = useCallback((callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected", unreadCount: 0 });
      }
      return;
    }

    socket.emit("getUnreadNotificationCount", {}, (ack) => {
      if (ack && ack.ok && ack.unreadCount !== undefined) {
        setUnreadNotificationCount(ack.unreadCount);
      } else {
      }
      if (callback) callback(ack);
    });
  }, [socket, isConnected]);


  const value = {
    socket,
    isConnected,
    connectionError,
    emit,
    joinGroup,
    leaveGroup,
    sendMessage,
    markMessageRead,
    markAllMessagesRead,
    getUnreadCount,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadNotificationCount,
    unreadNotificationCount,
    setUnreadNotificationCount,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};