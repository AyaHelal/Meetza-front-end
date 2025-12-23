import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
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


  // Use environment variable or derive from API base URL
  // For production, use the backend URL (socket.io connects at root, not /api)
  // Extract the base URL from API URL (remove /api suffix if present)
  const SERVER_URL = "https://courteous-uncomplimenting-aleena.ngrok-free.dev";


  useEffect(() => {
    // Only connect if we have a token
    if (!token) {
      console.log("⚠️ No token found, skipping Socket.IO connection");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Disconnect existing socket before creating a new one
    if (socketRef.current) {
      console.log("🔌 Disconnecting existing socket before reconnecting...");
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    console.log(`🔌 Connecting to Socket.IO at ${SERVER_URL}...`);

    // Create socket connection with authentication
    const newSocket = io(SERVER_URL, {
      auth: {
        token: token, // JWT token is required for authentication
      },
      transports: ["websocket", "polling"], // fallback options
      reconnection: false,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    // Connection successful
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);

      // Join notification room (backend does this automatically, but we can also explicitly join)
      newSocket.emit("join_notifications", (ack) => {
        if (ack && ack.ok) {
          console.log("✅ Joined notifications room");
        }
      });

      // Get initial unread notification count via socket
      newSocket.emit("getUnreadNotificationCount", {}, (ack) => {
        if (ack && ack.ok && ack.unreadCount !== undefined) {
          setUnreadNotificationCount(ack.unreadCount);
          console.log("🔔 Initial unread notification count:", ack.unreadCount);
        }
      });

      setConnectionError(null);
      hasLoggedSocketErrorRef.current = false;
    });

    // Listen for new notifications (emitted to the user's notification room)
    newSocket.on("newNotification", (notification) => {
      setUnreadNotificationCount((prevCount) => {
        const newCount = prevCount + 1;
        console.log("🔔 Received new notification, updated count:", newCount);
        return newCount;
      });
    });

    // Also listen for 'new_notification' event name (backup)
    newSocket.on("new_notification", (notification) => {
      setUnreadNotificationCount((prevCount) => {
        const newCount = prevCount + 1;
        console.log("🔔 Received new notification (new_notification), updated count:", newCount);
        return newCount;
      });
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
          console.warn(
            "⚠️ WebSocket connection failed, will fallback to polling transport"
          );
        }

        hasLoggedSocketErrorRef.current = true;
      }
    });


    // Disconnected
    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setIsConnected(false);
    });

    // Reconnection attempt
    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Reconnection attempt:", attemptNumber);
    });

    // Reconnection successful
    newSocket.on("reconnect", (attemptNumber) => {
      console.log("✅ Reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
      setConnectionError(null);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount or token change
    return () => {
      console.log("🔌 Cleaning up socket connection...");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, SERVER_URL]); // SERVER_URL is memoized and stable



  // Helper function to emit events with error handling
  const emit = (event, data, callback) => {
    if (!socket || !isConnected) {
      console.warn(`⚠️ Cannot emit ${event}: socket not connected`);
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
      console.warn(`⚠️ Cannot join group ${groupId}: socket not connected`);
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("joinGroup", { groupId: groupId }, (ack) => {
      if (ack && ack.ok) {
        console.log(`✅ Successfully joined group: ${groupId}`);
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
      console.warn(`⚠️ Cannot leave group ${groupId}: socket not connected`);
      return;
    }

    socket.emit("leaveGroup", { groupId: groupId });
    console.log(`👋 Left group: ${groupId}`);
  };

  // Helper function to send a message
  const sendMessage = (groupId, message, callback) => {
    if (!socket || !isConnected) {
      console.warn(`⚠️ Cannot send message: socket not connected`);
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("sendMessage", { groupId, message }, (ack) => {
      if (ack && ack.ok) {
        console.log("✅ Message sent successfully");
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
      console.warn(`⚠️ Cannot mark message as read: socket not connected`);
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("markMessageRead", { groupId, messageId }, (ack) => {
      if (callback) callback(ack);
    });
  };

  // Helper function to mark all messages as read
  const markAllMessagesRead = (groupId, callback) => {
    if (!socket || !isConnected) {
      console.warn(`⚠️ Cannot mark all messages as read: socket not connected`);
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("markAllMessagesRead", { groupId }, (ack) => {
      if (callback) callback(ack);
    });
  };

  // Helper function to get unread count
  const getUnreadCount = (groupId, callback) => {
    if (!socket || !isConnected) {
      console.warn(`⚠️ Cannot get unread count: socket not connected`);
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
      console.warn(`⚠️ Cannot get notifications: socket not connected`);
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
      console.warn(`⚠️ Cannot mark notification as read: socket not connected`);
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }

    socket.emit("markNotificationRead", { notificationId }, (ack) => {
      if (callback) callback(ack);
    });
  };

  // Helper function to mark all notifications as read
  const markAllNotificationsRead = async (callback) => {
    if (!socket || !isConnected) {
      console.warn(
        `⚠️ Cannot mark all notifications as read: socket not connected`
      );
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
  };

  // Helper function to get unread notification count via socket
  const getUnreadNotificationCount = (callback) => {
    if (!socket || !isConnected) {
      console.warn(`⚠️ Cannot get unread notification count: socket not connected`);
      if (callback) {
        callback({ ok: false, message: "Socket not connected", unreadCount: 0 });
      }
      return;
    }

    socket.emit("getUnreadNotificationCount", {}, (ack) => {
      if (ack && ack.ok && ack.unreadCount !== undefined) {
        setUnreadNotificationCount(ack.unreadCount);
      }
      if (callback) callback(ack);
    });
  };


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