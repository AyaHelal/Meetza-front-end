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
import {
  ensureUiSoundsUnlocked,
  playNotificationSound,
  armSuppressChatIncomingForNotification,
  playChatIncomingSound,
  shouldSuppressChatIncomingSound,
} from "../utils/uiSounds";

const SocketContext = createContext();

/** For global incoming-message sound only; mirrors GroupChat identity check. */
function isGroupSocketMessageFromSelf(messageData, u) {
  if (!u || !messageData) return false;
  const email = (messageData.sender_email || "").toLowerCase();
  const userEmail = (u.email || "").toLowerCase();
  if (email && userEmail && email === userEmail) return true;
  const sid = messageData.sender_id;
  const uid = u.id;
  if (sid == null || uid == null) return false;
  return String(sid) === String(uid);
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const unreadNotificationCountRef = useRef(0);
  const [unreadGroupChatCount, setUnreadGroupChatCount] = useState(0);
  const unreadGroupChatCountRef = useRef(0);
  const hasLoggedSocketErrorRef = useRef(false);
  const lastTokenRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const userRef = useRef(user);
  const activeGroupChatIdForSoundRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const setActiveGroupChatForSound = useCallback((groupId) => {
    activeGroupChatIdForSoundRef.current =
      groupId != null && groupId !== "" ? String(groupId) : null;
  }, []);

  // Use environment variable or default to ngrok URL
  // Socket.io connects at root, not /api, so remove /api suffix if present
  const apiUrl = (process.env.REACT_APP_SOCKET_URL || "http://localhost:4000").trim();
  const SERVER_URL = apiUrl.replace(/\/api$/, "");

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
        ensureUiSoundsUnlocked();

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

  useEffect(() => {
    unreadNotificationCountRef.current = unreadNotificationCount;
  }, [unreadNotificationCount]);

  useEffect(() => {
    unreadGroupChatCountRef.current = unreadGroupChatCount;
  }, [unreadGroupChatCount]);

  const refreshUnreadGroupChatCount = useCallback(async () => {
    // Only make the request if user is authenticated
    if (!token || !user) {
      return;
    }

    try {
      let res;
      try {
        res = await api.get("/home/stats");
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        res = await api.get("/home/stats/");
      }
      const root = res?.data?.data ?? res?.data ?? {};
      const raw = root?.group_chat_unread ?? root?.groupChatUnread ?? root?.unread_chat ?? 0;
      const n = Number(raw) || 0;
      unreadGroupChatCountRef.current = n;
      setUnreadGroupChatCount(n);
    } catch {
      // keep previous
    }
  }, [token, user]);

  // Bind notification listeners to the current socket instance (survives reconnect / state updates reliably).
  useEffect(() => {
    if (!socket) return;

    const onNewNotification = () => {
      armSuppressChatIncomingForNotification();
      playNotificationSound();
    };

    const onNotificationCountUpdate = (data) => {
      const count =
        Array.isArray(data) && data[0]?.unreadCount !== undefined
          ? data[0].unreadCount
          : data?.unreadCount !== undefined
            ? data.unreadCount
            : typeof data === "number"
              ? data
              : null;

      const prev = Number(unreadNotificationCountRef.current) || 0;
      let next = prev;

      if (count !== null && count !== undefined) {
        const n = Number(count);
        if (!Number.isNaN(n)) next = n;
      } else {
        next = prev + 1;
      }

      if (next > prev) {
        armSuppressChatIncomingForNotification();
        playNotificationSound();
      }

      const nextSafe = Number.isNaN(next) ? prev : next;
      unreadNotificationCountRef.current = nextSafe;
      setUnreadNotificationCount(nextSafe);
    };

    socket.on("new_notification", onNewNotification);
    socket.on("newNotification", onNewNotification);
    socket.on("notification_count_update", onNotificationCountUpdate);

    return () => {
      socket.off("new_notification", onNewNotification);
      socket.off("newNotification", onNewNotification);
      socket.off("notification_count_update", onNotificationCountUpdate);
    };
  }, [socket]);

  /* Incoming chat sound app-wide. Does not touch message state — useGroupChatSocket keeps all message logic. */
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onIncomingMessageSound = (messageData) => {
      try {
        const messageGroupId = String(
          messageData?.group_id || messageData?.groupId || messageData?.group || ""
        );
        if (
          !messageData ||
          !messageGroupId ||
          messageGroupId === "undefined" ||
          messageGroupId === "null"
        ) {
          return;
        }
        if (isGroupSocketMessageFromSelf(messageData, userRef.current)) return;

        const activeId = activeGroupChatIdForSoundRef.current;
        const viewingThisThread =
          Boolean(activeId) && String(activeId) === messageGroupId;

        // Maintain a lightweight global unread badge count for the chat icon.
        // If user isn't viewing the incoming thread, increment and let a refresh sync exact server count later.
        if (!viewingThisThread) {
          const prev = Number(unreadGroupChatCountRef.current) || 0;
          const next = Math.min(prev + 1, 999);
          unreadGroupChatCountRef.current = next;
          setUnreadGroupChatCount(next);
        }

        setTimeout(() => {
          if (!shouldSuppressChatIncomingSound()) {
            playChatIncomingSound(viewingThisThread);
          }
        }, 0);
      } catch (_) {
        /* ignore */
      }
    };

    socket.on("message", onIncomingMessageSound);
    return () => socket.off("message", onIncomingMessageSound);
  }, [socket, isConnected]);

  // On connect and when tab becomes active, refresh unread chat count from server.
  useEffect(() => {
    if (!socket || !isConnected) return;
    const t = setTimeout(() => {
      refreshUnreadGroupChatCount();
    }, 700);
    return () => clearTimeout(t);
  }, [socket, isConnected, refreshUnreadGroupChatCount]);

  useEffect(() => {
    const onFocus = () => refreshUnreadGroupChatCount();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshUnreadGroupChatCount();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshUnreadGroupChatCount]);

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

  /** Toggle reaction on a group message (server ack + `messageReactionUpdated` broadcast). */
  const socketReactToMessage = (groupId, messageId, emoji, callback) => {
    if (!socket || !isConnected) {
      if (callback) {
        callback({ ok: false, message: "Socket not connected" });
      }
      return;
    }
    const cleanEmoji = String(emoji ?? "").trim().slice(0, 20);
    if (!groupId || !messageId || !cleanEmoji) {
      if (callback) {
        callback({ ok: false, message: "groupId, messageId, and emoji are required" });
      }
      return;
    }
    socket.emit(
      "reactToMessage",
      { groupId, messageId, emoji: cleanEmoji },
      (ack) => {
        if (ack && !ack.ok) {
          console.error("❌ reactToMessage:", ack?.message || "Unknown error");
        }
        if (callback) callback(ack);
      }
    );
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
    setActiveGroupChatForSound,
    emit,
    joinGroup,
    leaveGroup,
    sendMessage,
    socketReactToMessage,
    markMessageRead,
    markAllMessagesRead,
    getUnreadCount,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadNotificationCount,
    unreadNotificationCount,
    setUnreadNotificationCount,
    unreadGroupChatCount,
    refreshUnreadGroupChatCount,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};