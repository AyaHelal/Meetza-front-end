import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import "./GroupChat.css";
import ChatsPanel from "./components/ChatsPanel";
import MainChat from "./components/MainChat";
import RightSidebar from "./components/RightSidebar";
import { categorizeResources, categorizeMediaItems } from "./components/utils";

import axiosInstance from "../../API/axiosInstance";
import { AuthContext } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { smartToast } from "../../API/toastManager";

//const SERVER_URL = "https://meetza-backend.vercel.app";

const MEDIA_TYPE_MAP = {
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"],
  video: ["mp4", "mov", "webm", "mkv"],
  audio: ["mp3", "wav", "m4a", "aac", "ogg", "webm"],
};

const MIME_EXTENSION_MAP = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
  "audio/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

const deriveExtensionFromMime = (mime) => {
  if (!mime) return "";
  const cleanMime = mime.split(";")[0]?.trim().toLowerCase();
  if (MIME_EXTENSION_MAP[cleanMime]) {
    return MIME_EXTENSION_MAP[cleanMime];
  }
  if (cleanMime.includes("/")) {
    const subtype = cleanMime.split("/")[1];
    if (subtype === "plain") return "txt";
    if (subtype) {
      return subtype;
    }
  }
  return "";
};

const extractExtension = (mediaItem) => {
  const fromName = mediaItem?.file_name?.split(".").pop();
  if (fromName) {
    return fromName.toLowerCase();
  }

  const url = mediaItem?.media_url || mediaItem?.file_url || "";
  if (!url) return "";
  const cleanUrl = url.split("?")[0];
  if (cleanUrl.includes(".")) {
    return cleanUrl.split(".").pop().toLowerCase();
  }
  const mimeExt = deriveExtensionFromMime(
    mediaItem?.file_type || mediaItem?.media_type
  );
  return mimeExt || "";
};

const deriveMediaTypeFromExtension = (extension) => {
  if (!extension) return "document";
  if (MEDIA_TYPE_MAP.image.includes(extension)) return "image";
  if (MEDIA_TYPE_MAP.video.includes(extension)) return "video";
  if (MEDIA_TYPE_MAP.audio.includes(extension)) return "audio";
  return "document";
};

const deriveFileName = (mediaItem) => {
  const extension =
    extractExtension(mediaItem) ||
    deriveExtensionFromMime(mediaItem?.file_type || mediaItem?.media_type);

  const ensureExtension = (name) => {
    if (!name) return "";
    const trimmed = name.trim();
    if (!trimmed) return "";
    if (trimmed.includes(".") && trimmed.split(".").pop().length <= 6) {
      return trimmed;
    }
    if (extension) {
      return `${trimmed}.${extension}`;
    }
    return trimmed;
  };

  if (mediaItem?.file_name) {
    const normalized = ensureExtension(mediaItem.file_name);
    if (normalized) return normalized;
  }

  const url = mediaItem?.media_url || mediaItem?.file_url;
  if (url) {
    try {
      const parsed = new URL(url);
      const candidate = decodeURIComponent(
        parsed.pathname.split("/").pop() || ""
      );
      if (candidate) {
        if (candidate.includes(".") || !extension) {
          return candidate;
        }
        return `${candidate}.${extension}`;
      }
    } catch (err) {
      const fallback = url.split("?")[0].split("/").pop();
      if (fallback) {
        if (fallback.includes(".") || !extension) {
          return fallback;
        }
        return `${fallback}.${extension}`;
      }
    }
  }

  if (extension) {
    return `document.${extension}`;
  }
  return "document";
};

const normalizeMediaItems = (mediaItems, messageId) => {
  if (!Array.isArray(mediaItems)) return [];
  return mediaItems.map((item, index) => {
    const mediaUrl = item?.media_url || item?.file_url || "";
    const extension = extractExtension(item);

    // IMPORTANT: Check media_type FIRST (from server) before file_type (MIME type)
    // This ensures voice_note is preserved even if file_type is video/webm
    const mediaType = typeof item?.media_type === "string" ? item.media_type : "";
    const fileType = typeof item?.file_type === "string" ? item.file_type : "";

    // Use media_type if available, otherwise fallback to file_type
    const declaredType = mediaType || fileType;

    let normalizedType = declaredType?.toLowerCase() || "";

    // CRITICAL: Check for voice_note FIRST before any other type checking
    // This handles cases where voice notes are saved as video/webm
    if (mediaType === "voice_note" || mediaType === "voice" ||
        normalizedType === "voice_note" || normalizedType === "voice") {
      normalizedType = "voice_note";
    } else if (normalizedType.startsWith("image")) {
      normalizedType = "image";
    } else if (normalizedType.startsWith("video")) {
      // Double check: if media_type is voice_note, don't treat as video
      if (mediaType === "voice_note" || mediaType === "voice") {
        normalizedType = "voice_note";
      } else {
        normalizedType = "video";
      }
    } else if (normalizedType.startsWith("audio")) {
      normalizedType = "audio";
    } else if (
      !normalizedType ||
      normalizedType === "file" ||
      normalizedType === "document"
    ) {
      normalizedType = deriveMediaTypeFromExtension(extension);
      // Final check: if media_type says voice_note, override extension-based detection
      if (mediaType === "voice_note" || mediaType === "voice") {
        normalizedType = "voice_note";
      }
    } else {
      normalizedType = deriveMediaTypeFromExtension(extension) || "document";
      // Final check: if media_type says voice_note, override extension-based detection
      if (mediaType === "voice_note" || mediaType === "voice") {
        normalizedType = "voice_note";
      }
    }

    return {
      ...item,
      id: item?.id || `${messageId || "msg"}-media-${index}`,
      media_url: mediaUrl,
      file_url: mediaUrl,
      file_name: deriveFileName(item),
      media_type: normalizedType,
    };
  });
};

//const SERVER_URL = "https://meetza-backend.vercel.app";

export default function GroupChat() {
  const { user } = useContext(AuthContext);
  const {
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    markAllMessagesRead,
    getUnreadCount,
    sendMessage: socketSendMessage,
  } = useSocket();
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMainChat, setShowMainChat] = useState(false);
  const [groupChats, setGroupChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

  // Function to load more messages
  const loadMoreMessages = async () => {
    if (!selectedChat || loadingMoreMessages || !hasMoreMessages) return;

    try {
      setLoadingMoreMessages(true);
      const groupId = groupChats[selectedChat]?.id;
      if (!groupId) return;

      const offset = messages.length;
      const messagesResponse = await axiosInstance.get(
        `/chat/groups/${groupId}/messages?limit=50&offset=${offset}`
      );

      if (messagesResponse.data.success) {
        const newMessages = messagesResponse.data.data.map((msg) =>
          formatMessage(msg)
        );

        // Prepend new messages to existing messages
        setMessages((prev) => [...newMessages, ...prev]);

        // Check if there are more messages available
        setHasMoreMessages(newMessages.length === 50);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
      smartToast.error("Failed to load more messages");
    } finally {
      setLoadingMoreMessages(false);
    }
  };
  const [activeInfoSection, setActiveInfoSection] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showRightSidebarMobile, setShowRightSidebarMobile] = useState(false);
  // Track which groups we've already marked as read to prevent loops
  const markedAsReadRef = React.useRef(new Set());
  // Track which groups have been opened/read in this session - always keep unread at 0 for these
  const readGroupsRef = React.useRef(new Set());
  // Track current group ID for socket operations
  const currentGroupIdRef = useRef(null);
  // Store markAllMessagesRead in ref to prevent useEffect re-runs
  const markAllMessagesReadRef = useRef(markAllMessagesRead);
  useEffect(() => {
    markAllMessagesReadRef.current = markAllMessagesRead;
  }, [markAllMessagesRead]);
  // Track user data for duplicate detection
  const userRef = useRef(user);

  // Keep userRef in sync
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const formatMessage = useCallback(
    (msg) => ({
      id: msg.id,
      sender: msg.sender_name,
      initials: msg.sender_name?.charAt(0)?.toUpperCase() || "U",
      time: msg.created_at
        ? new Date(msg.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
      date: msg.created_at
        ? new Date(msg.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
      created_at: msg.created_at || new Date().toISOString(),
      text: msg.message,
      senderPhoto: msg.sender_photo,
      senderEmail: msg.sender_email,
      media: normalizeMediaItems(msg.media, msg.id),
      is_read: msg.is_read,
      read_at: msg.read_at,
    }),
    []
  );

  const deriveMediaCategory = useCallback((file, fallbackCategory) => {
    if (fallbackCategory && fallbackCategory !== "file") {
      return fallbackCategory;
    }
    const mime = file?.type || "";
    if (mime.startsWith("image")) return "image";
    if (mime.startsWith("video")) return "video";
    if (mime.startsWith("audio")) return "audio";
    return "document";
  }, []);

  const getMediaLabel = useCallback((mediaType, fileName) => {
    switch (mediaType) {
      case 'audio':
      case 'voice_note':
        return '🎤 Audio';
      case 'image':
        return '📷 Photo';
      case 'video':
        return '📷 Video';
      case 'document':
      default:
        return fileName || '📄 Document';
    }
  }, []);

  const getMessageSubject = useCallback((message) => {
    if (message.text) return message.text;
    if (message.media && message.media.length > 0) {
      const media = message.media[0];
      return getMediaLabel(media.media_type, media.file_name);
    }
    return 'No messages yet';
  }, [getMediaLabel]);

  const extractLinksFromMessages = (messages = []) => {
    console.log("Processing messages for links:", messages);
    const links = [];
    messages?.forEach((msg) => {
      // Skip if message is deleted or has media (we only want plain text messages with links)
      if (msg.is_deleted || (msg.media && msg.media.length > 0)) {
        console.log("Skipping message (deleted or has media):", msg.id, {
          is_deleted: msg.is_deleted,
          has_media: msg.media?.length > 0,
        });
        return;
      }

      if (msg.message) {
        console.log("Checking message for URLs:", {
          id: msg.id,
          message: msg.message,
        });
        const urlRegex = /https?:\/\/[^\s<>,;]+/g;
        const urls = msg.message.match(urlRegex) || [];
        console.log("Found URLs:", urls);

        urls.forEach((url) => {
          try {
            const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
            const isFileUrl =
              /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(
                cleanUrl
              );

            if (!isFileUrl) {
              const urlObj = new URL(cleanUrl);
              const linkData = {
                id: `link-${msg.id}-${cleanUrl}`,
                media_url: cleanUrl,
                file_name: urlObj.hostname.replace("www.", ""),
                original_url: cleanUrl,
                created_at: msg.created_at,
                sender_name: msg.sender_name,
                message_id: msg.id,
                isLink: true,
                is_downloadable: false,
              };
              console.log("Adding link:", linkData);
              links.push(linkData);
            } else {
              console.log("Skipping file URL:", cleanUrl);
            }
          } catch (e) {
            console.warn("Invalid URL:", url, e);
          }
        });
      }
    });
    console.log("Extracted links:", links);
    return links;
  };

  // Add class to body when GroupChat is mounted
  useEffect(() => {
    document.documentElement.classList.add("group-chat-active");
    document.body.classList.add("group-chat-active");

    return () => {
      document.documentElement.classList.remove("group-chat-active");
      document.body.classList.remove("group-chat-active");
    };
  }, []);

  // Define group event handler outside socket effect so it can be referenced in cleanup
  const groupEventNames = [
    "groupCreated",
    "group_created",
    "newGroup",
    "new_group",
    "group:add",
    "group",
    "groupUpdated",
  ];

  const handleGroupEvent = async (payload) => {
    try {
      console.log("🔔 Group event received:", payload);

      let group = null;
      if (payload && typeof payload === "object") {
        if (payload.id || payload.group_id || payload.groupId) {
          const id = payload.id || payload.group_id || payload.groupId;
          if (payload.group_name || payload.name) {
            group = { ...payload, id };
          } else {
            const res = await axiosInstance.get("/chat/groups");
            const list = res?.data?.data || [];
            group = list.find(
              (g) => g.id === id || g.group_id === id || g.id === Number(id)
            );
          }
        } else if (payload.group_name || payload.name) {
          group = payload;
        }
      }

      if (!group) {
        const res = await axiosInstance.get("/chat/groups");
        const list = res?.data?.data || [];
        const groupsWithContent = await Promise.all(
          list.map(async (g) => {
            let contentName = "No content";
            try {
              if (g.group_content_id) {
                const contentResponse = await axiosInstance.get(
                  `/group-contents/${g.group_content_id}`
                );
                if (contentResponse.data && contentResponse.data.success) {
                  const data = contentResponse.data.data || {};
                  contentName =
                    data.name ||
                    data.title ||
                    data.content_name ||
                    data.group_name ||
                    data.group_title ||
                    data.title_en ||
                    data.name_en ||
                    data.description ||
                    "No content";
                  if (!contentName || contentName === "No content") {
                    console.warn(
                      `⚠️ No content name found for content id ${g.group_content_id}`,
                      data
                    );
                  }
                }
              }
            } catch (e) {
              console.warn(
                "❌ Error fetching content for group during group-event refresh",
                e
              );
            }
            return { ...g, contentName };
          })
        );

        const formatted = groupsWithContent.map((g) => ({
          id: g.id,
          name: g.group_name,
          subject: g.last_message || "No messages yet",
          avatar: g.group_name?.charAt(0)?.toUpperCase() || "G",
          avatarImage: g.group_photo || null,
          date: g.last_message_at
            ? new Date(g.last_message_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              }),
          unread: 0,
          group_name: g.group_name,
          group_content_id: g.group_content_id,
          contentName: g.contentName,
        }));

        setGroupChats(formatted);
        return;
      }

      let contentName =
        group.contentName ||
        group.content_name ||
        group.title ||
        group.name ||
        "No content";
      if (!contentName && group.group_content_id) {
        try {
          const contentResponse = await axiosInstance.get(
            `/group-contents/${group.group_content_id}`
          );
          if (contentResponse.data && contentResponse.data.success) {
            const data = contentResponse.data.data || {};
            contentName =
              data.name ||
              data.title ||
              data.content_name ||
              data.group_name ||
              data.group_title ||
              data.title_en ||
              data.name_en ||
              data.description ||
              "No content";
          }
        } catch (e) {
          console.warn("❌ Error fetching content for new group", e);
        }
      }

      const formattedGroup = {
        id: group.id,
        name: group.group_name || group.name,
        subject: group.last_message || "No messages yet",
        avatar: (group.group_name || group.name || "G").charAt(0).toUpperCase(),
        avatarImage: group.group_photo || null,
        date: group.last_message_at
          ? new Date(group.last_message_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          : new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            }),
        unread: 0,
        group_name: group.group_name || group.name,
        group_content_id: group.group_content_id,
        contentName: contentName,
      };

      setGroupChats((prev) => {
        const exists = prev.some(
          (g) => String(g.id) === String(formattedGroup.id)
        );
        if (exists) {
          return prev.map((g) =>
            String(g.id) === String(formattedGroup.id) ? formattedGroup : g
          );
        }
        return [formattedGroup, ...prev];
      });
    } catch (err) {
      console.error("❌ Error handling group event:", err);
    }
  };

  // Listen for Socket.IO message events - Set up BEFORE joining groups
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (messageData) => {
      console.log("📨 New message received via Socket.IO:", messageData);
      console.log("📨 Current group ID:", currentGroupIdRef.current);

      // Handle different possible field names for group ID
      const messageGroupId = String(
        messageData.group_id || messageData.groupId || messageData.group || ""
      );

      console.log("📨 Message group ID (parsed):", messageGroupId);

      if (
        !messageData ||
        !messageGroupId ||
        messageGroupId === "undefined" ||
        messageGroupId === "null"
      ) {
        console.warn(
          "⚠️ Invalid message data received - missing group ID:",
          messageData
        );
        return;
      }

      const isForCurrentGroup =
        currentGroupIdRef.current &&
        String(currentGroupIdRef.current) === messageGroupId;

      console.log("📨 Is for current group?", isForCurrentGroup);

      // Add message to UI if it's for the currently selected group
      if (isForCurrentGroup) {
        console.log("✅ Message is for current group, adding to UI");
        console.log("📨 Message details:", {
          id: messageData.id,
          sender: messageData.sender_name,
          text: messageData.message || messageData.text,
          group_id: messageGroupId,
          current_group: currentGroupIdRef.current,
        });

        // Ensure message has required fields
        if (!messageData.message && !messageData.text) {
          console.warn("⚠️ Message missing text field:", messageData);
        }

        const formattedMessage = formatMessage(messageData);
        console.log("📨 Formatted message:", formattedMessage);
        setMessages((prev) => {
          // Check if message already exists by ID (avoid duplicates)
          const existingIndex = prev.findIndex((msg) => {
            // Check by exact ID match
            if (msg.id === messageData.id) return true;
            // Also check if it's a temp message that should be replaced
            if (msg.id && msg.id.startsWith("temp-") && messageData.id) {
              // Check if this is the same message (same text and recent timestamp)
              const currentUser = userRef.current;
              const isFromCurrentUser =
                messageData.sender_email === currentUser?.email ||
                messageData.sender_id === currentUser?.id;
              if (isFromCurrentUser && msg.text === messageData.message) {
                const timeDiff = Math.abs(
                  new Date(msg.created_at).getTime() -
                    new Date(messageData.created_at).getTime()
                );
                if (timeDiff < 10000) {
                  // Within 10 seconds
                  return true; // This is the temp message that should be replaced
                }
              }
            }
            return false;
          });

          if (existingIndex !== -1) {
            // Message already exists, update it instead of adding duplicate
            console.log("🔄 Updating existing message:", messageData.id);
            const updated = [...prev];
            updated[existingIndex] = formattedMessage;
            return updated;
          }

          // New message, add it
          console.log("➕ Adding new message to UI:", messageData.id);
          return [...prev, formattedMessage];
        });

        // Mark as read if chat is open (only for messages from others)
        const currentUser = userRef.current;
        const isFromCurrentUser =
          messageData.sender_email === currentUser?.email ||
          messageData.sender_id === currentUser?.id;

        if (!isFromCurrentUser && currentGroupIdRef.current) {
          // Only mark as read if message is from another user
          markAllMessagesReadRef.current(currentGroupIdRef.current, (ack) => {
            if (ack && ack.ok) {
              setGroupChats((prev) =>
                prev.map((g) =>
                  String(g.id) === String(currentGroupIdRef.current)
                    ? { ...g, unread: 0 }
                    : g
                )
              );
            }
          });
        }
      } else {
        console.log(
          "ℹ️ Message is for another group, updating unread count only"
        );
      }

      // Update last_message in groupChats list for all groups
      if (
        messageGroupId &&
        messageGroupId !== "undefined" &&
        messageGroupId !== "null"
      ) {
        setGroupChats((prev) =>
          prev.map((group) => {
            if (String(group.id) !== messageGroupId) {
              return group; // Not this group, return unchanged
            }

            // This is the group the message belongs to
            const isCurrentGroup =
              String(group.id) === String(currentGroupIdRef.current);
            const currentUser = userRef.current;
            const isFromCurrentUser =
              messageData.sender_email === currentUser?.email ||
              messageData.sender_id === currentUser?.id;

            // Calculate new unread count
            let newUnread = group.unread || 0;
            if (isCurrentGroup) {
              // If it's the current group and message is from another user, keep unread at 0
              // (we'll mark as read in the handler above)
              newUnread = 0;
            } else {
              // If it's NOT the current group, increment unread count
              // But only if message is from another user (not your own message)
              if (!isFromCurrentUser) {
                newUnread = (group.unread || 0) + 1;
                console.log(
                  `📬 Incrementing unread for group ${messageGroupId}: ${newUnread}`
                );
              } else {
                // Your own message in another group - don't increment unread
                console.log(
                  `ℹ️ Your own message in group ${messageGroupId}, not incrementing unread`
                );
              }
            }

            const messageSubject = messageData.message || messageData.text;
            const subject = messageSubject || (messageData.media && messageData.media.length > 0
              ? getMediaLabel(messageData.media[0].media_type, messageData.media[0].file_name)
              : "No messages yet");
            return {
              ...group,
              subject,
              unread: newUnread,
            };
          })
        );
      }
    };

    // Set up message listener BEFORE joining groups
    console.log("🎧 Setting up Socket.IO message listener");

    // Also listen for any socket events for debugging
    const handleAnyEvent = (eventName, ...args) => {
      if (eventName === "message") {
        // This will be handled by handleNewMessage
        return;
      }
      console.log(`🔔 Socket event received: ${eventName}`, args);
    };

    socket.on("message", handleNewMessage);

    // Listen for all events for debugging (remove in production if needed)
    socket.onAny(handleAnyEvent);

    return () => {
      console.log("🎧 Removing Socket.IO message listener");
      socket.off("message", handleNewMessage);
      socket.offAny(handleAnyEvent);
    };
  }, [socket, isConnected, formatMessage]);

  // Reusable function to fetch and format groups
  const refreshGroupsList = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const response = await axiosInstance.get("/chat/groups");
      if (response.data.success) {
        // Fetch content names for each group
        const groupsWithContent = await Promise.all(
          response.data.data.map(async (group) => {
            let contentName = "No content";
            try {
              if (group.group_content_id) {
                const contentResponse = await axiosInstance.get(
                  `/group-contents/${group.group_content_id}`
                );
                if (contentResponse.data && contentResponse.data.success) {
                  const data = contentResponse.data.data || {};
                  contentName =
                    data.name ||
                    data.title ||
                    data.content_name ||
                    data.group_name ||
                    data.group_title ||
                    data.title_en ||
                    data.name_en ||
                    data.description ||
                    "No content";
                  if (!contentName || contentName === "No content") {
                    console.warn(
                      `⚠️ No content name found for content id ${group.group_content_id}`,
                      data
                    );
                  }
                }
              }
            } catch (error) {
              console.error(
                `❌ Error fetching content for group ${group.id}:`,
                error
              );
            }
            return { ...group, contentName };
          })
        );

        // Format groups to match ChatItem component structure
        const formattedGroups = groupsWithContent.map((group) => ({
          id: group.id,
          name: group.group_name,
          subject: group.last_message || "No messages yet",
          avatar: group.group_name?.charAt(0)?.toUpperCase() || "G",
          avatarImage: group.group_photo || null,
          date: group.last_message_at
            ? new Date(group.last_message_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              }),
          // Use unread count from API if available, otherwise default to 0
          unread: group.unread || group.unread_count || group.unreadCount || 0,
          group_name: group.group_name,
          group_content_id: group.group_content_id,
          contentName: group.contentName,
        }));

        // Preserve the currently selected chat by ID when updating the list
        const currentSelectedId =
          selectedChat !== null && groupChats[selectedChat]
            ? groupChats[selectedChat].id
            : null;

        setGroupChats((prev) => {
          // If this is the initial load, set all groups
          if (isInitial) {
            return formattedGroups;
          }

          // Preserve unread counts from previous state, especially for groups that were marked as read
          console.log(
            "📖 readGroupsRef contents:",
            Array.from(readGroupsRef.current)
          );
          return formattedGroups.map((newGroup) => {
            const groupIdStr = String(newGroup.id);
            const apiUnreadCount = newGroup.unread; // This is from the API response (line 533)

            // If this group has been opened/read in this session, check if new messages arrived
            if (readGroupsRef.current.has(groupIdStr)) {
              // If API returns a positive unread count, it means new messages arrived after being read
              // Remove from readGroupsRef to allow the badge to show
              if (apiUnreadCount > 0) {
                console.log(
                  `📖 New messages arrived for group ${groupIdStr} (API returned ${apiUnreadCount}), removing from readGroupsRef to show badge`
                );
                readGroupsRef.current.delete(groupIdStr);
                // Use the API value to show the badge
                return {
                  ...newGroup,
                  unread: apiUnreadCount,
                };
              } else {
                // No new messages, keep unread at 0
                console.log(
                  `📖 Preserving unread=0 for group ${groupIdStr} (API returned ${apiUnreadCount}, was opened, no new messages)`
                );
                return {
                  ...newGroup,
                  unread: 0, // Force to 0, ignore API response - user has already seen this chat
                };
              }
            }

            // Otherwise use the unread count from API or previous state
            const oldGroup = prev.find((g) => String(g.id) === groupIdStr);
            if (oldGroup) {
              // If old group had unread: 0, preserve it (might have been marked as read)
              // Otherwise use the new unread count from API
              const preservedUnread =
                oldGroup.unread === 0
                  ? 0
                  : newGroup.unread || oldGroup.unread || 0;
              console.log(
                `📖 Group ${groupIdStr}: API=${apiUnreadCount}, Old=${oldGroup.unread}, Preserved=${preservedUnread}`
              );
              return {
                ...newGroup,
                unread: preservedUnread,
              };
            }
            // New group, use API value
            console.log(
              `📖 New group ${groupIdStr}: using API unread count ${apiUnreadCount}`
            );
            return newGroup;
          });
        });

        // After state update, restore selectedChat index to the position of the same group id
        // Only restore if there was a previously selected chat (don't auto-select on initial load)
        if (currentSelectedId) {
          const newIndex = formattedGroups.findIndex(
            (g) => String(g.id) === String(currentSelectedId)
          );
          if (newIndex !== -1) {
            setSelectedChat(newIndex);
          } else {
            // selected group was deleted - clear selection
            setSelectedChat(null);
          }
        }
        // Removed auto-selection on initial load - user should manually select a chat
      }
    } catch (error) {
      console.error("❌ Error fetching groups:", error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Track which groups we've joined via Socket.IO
  const joinedGroupsRef = useRef(new Set());

  // Fetch groups list on initial mount
  useEffect(() => {
    refreshGroupsList(true);
  }, []);

  // Join all groups via Socket.IO when groups are loaded and socket is connected
  // This ensures we receive messages for all groups, not just the selected one
  useEffect(() => {
    if (!socket || !isConnected || groupChats.length === 0) return;

    console.log("🔌 Joining all groups via Socket.IO to receive messages...");

    // Capture current groups for cleanup
    const currentGroups = [...groupChats];
    const groupsToJoin = currentGroups.map((g) => ({
      id: g.id,
      idStr: String(g.id),
    }));
    const groupsJoinedInThisEffect = new Set(); // Track groups joined in this effect

    groupsToJoin.forEach(({ id, idStr }) => {
      // Skip if already joined
      if (joinedGroupsRef.current.has(idStr)) {
        return;
      }

      // Join the group
      joinGroup(id, (ack) => {
        if (ack && ack.ok) {
          joinedGroupsRef.current.add(idStr);
          groupsJoinedInThisEffect.add(idStr);
          console.log(`✅ Joined group ${id} for message receiving`);
        } else {
          console.warn(`⚠️ Failed to join group ${id}:`, ack?.message);
        }
      });
    });

    // Cleanup: Leave all groups that were joined in this effect
    return () => {
      console.log("👋 Leaving groups on cleanup...");
      groupsToJoin.forEach(({ id, idStr }) => {
        // Only leave if we joined it in this effect
        if (groupsJoinedInThisEffect.has(idStr)) {
          leaveGroup(id);
          joinedGroupsRef.current.delete(idStr);
        }
      });
    };
  }, [socket, isConnected, groupChats, joinGroup, leaveGroup]);

  // Listen for Socket.IO group events instead of polling
  useEffect(() => {
    if (!socket || !isConnected) return;

    const groupEventNames = [
      "groupCreated",
      "group_created",
      "newGroup",
      "new_group",
      "group:add",
      "group",
      "groupUpdated",
    ];

    const handleGroupEvent = async (payload) => {
      try {
        console.log("🔔 Group event received:", payload);
        await refreshGroupsList(false);
      } catch (err) {
        console.error("❌ Error handling group event:", err);
      }
    };

    groupEventNames.forEach((eventName) => {
      socket.on(eventName, handleGroupEvent);
    });

    return () => {
      groupEventNames.forEach((eventName) => {
        socket.off(eventName, handleGroupEvent);
      });
    };
  }, [socket, isConnected]);

  // Get current groupId from selected chat (memoized to prevent unnecessary re-runs)
  const currentGroupId = useMemo(() => {
    if (selectedChat === null || !groupChats || groupChats.length === 0)
      return null;
    return groupChats[selectedChat]?.id || null;
  }, [selectedChat, groupChats]);

  // Fetch messages and group info when selected chat changes
  useEffect(() => {
    if (selectedChat === null || !currentGroupId) {
      setChatLoading(false);
      return;
    }

    const fetchMessagesAndInfo = async () => {
      try {
        setChatLoading(true);
        const groupId = currentGroupId;
        const groupIdStr = String(groupId);

        console.log(
          "📖 Opening chat, marking messages as read for group:",
          groupIdStr
        );

        // Always mark messages as read when chat is opened
        // Mark this group as read in our tracking FIRST (before any API calls)
        readGroupsRef.current.add(groupIdStr);
        console.log(
          "📖 Added to readGroupsRef:",
          Array.from(readGroupsRef.current)
        );

        // Update local unread count to 0 immediately (optimistic update)
        // This ensures the badge disappears immediately when chat is selected
        setGroupChats((prev) => {
          const updated = prev.map((g) => {
            if (String(g.id) === groupIdStr) {
              console.log(
                `📖 Setting unread to 0 for group ${groupIdStr} (was ${g.unread})`
              );
              return { ...g, unread: 0 };
            }
            return g;
          });
          return updated;
        });

        // Mark messages as read via Socket.IO
        if (socket && isConnected) {
          console.log(
            `📖 Marking all messages as read via Socket.IO for group ${groupId}...`
          );
          markAllMessagesRead(groupId, (ack) => {
            if (ack && ack.ok) {
              markedAsReadRef.current.add(groupIdStr);
              console.log("✅ Marked messages as read for group", groupId);
              // Update unread count from acknowledgment
              const unreadCount = ack.unreadCount || 0;
              setGroupChats((prev) =>
                prev.map((g) =>
                  String(g.id) === groupIdStr
                    ? { ...g, unread: unreadCount }
                    : g
                )
              );
            } else {
              // Fallback to REST API if Socket.IO fails
              console.warn(
                "⚠️ Socket.IO mark-as-read failed, trying REST API..."
              );
              axiosInstance
                .put(`/chat/groups/${groupId}/messages/read-all`)
                .then(() => {
                  markedAsReadRef.current.add(groupIdStr);
                  setGroupChats((prev) =>
                    prev.map((g) =>
                      String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
                    )
                  );
                })
                .catch((e) => {
                  console.warn("⚠️ REST API mark-as-read also failed:", e);
                  markedAsReadRef.current.add(groupIdStr);
                  setGroupChats((prev) =>
                    prev.map((g) =>
                      String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
                    )
                  );
                });
            }
          });
        } else {
          // Fallback to REST API if socket not connected
          try {
            console.log(
              `📖 Socket not connected, using REST API for mark-as-read...`
            );
            await axiosInstance.put(
              `/chat/groups/${groupId}/messages/read-all`
            );
            markedAsReadRef.current.add(groupIdStr);
            setGroupChats((prev) =>
              prev.map((g) =>
                String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
              )
            );
          } catch (e) {
            console.warn("⚠️ Failed to mark messages as read:", e);
            markedAsReadRef.current.add(groupIdStr);
            setGroupChats((prev) =>
              prev.map((g) =>
                String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
              )
            );
          }
        }

        // Fetch messages - load only last 50 messages initially
        const messagesResponse = await axiosInstance.get(
          `/chat/groups/${groupId}/messages?limit=50&offset=0`
        );
        if (messagesResponse.data.success) {
          const formattedMessages = messagesResponse.data.data.map((msg) =>
            formatMessage(msg)
          );
          setMessages(formattedMessages);
          // Check if there are more messages available
          setHasMoreMessages(messagesResponse.data.data.length === 50);
        }

        // Fetch group info
        const infoResponse = await axiosInstance.get(
          `/chat/groups/${groupId}/info`
        );
        if (infoResponse.data.success) {
          setGroupInfo(infoResponse.data.data);
        }
      } catch (error) {
        console.error("❌ Error fetching messages/info:", error);
      } finally {
        setChatLoading(false);
      }
    };

    fetchMessagesAndInfo();

    // Set current group ID when chat is selected (for message filtering)
    // Note: We already join all groups in a separate useEffect, so we don't need to join here
    if (currentGroupId) {
      currentGroupIdRef.current = currentGroupId;
      console.log(`📌 Current group ID set to: ${currentGroupId}`);

      // Ensure this group is joined (it should already be, but double-check)
      const groupIdStr = String(currentGroupId);
      if (socket && isConnected && !joinedGroupsRef.current.has(groupIdStr)) {
        console.log(
          `🔌 Group ${currentGroupId} not yet joined, joining now...`
        );
        joinGroup(currentGroupId, (ack) => {
          if (ack && ack.ok) {
            joinedGroupsRef.current.add(groupIdStr);
            console.log(`✅ Joined group ${currentGroupId} via Socket.IO`);
          }
        });
      }

      // Get initial unread count for the selected group
      if (socket && isConnected) {
        getUnreadCount(currentGroupId, (ack) => {
          if (ack && ack.ok) {
            const unreadCount = ack.unreadCount || 0;
            setGroupChats((prev) =>
              prev.map((g) =>
                String(g.id) === String(currentGroupId)
                  ? { ...g, unread: unreadCount }
                  : g
              )
            );
          }
        });
      }
    } else {
      currentGroupIdRef.current = null;
    }

    // Cleanup: Leave group when chat is deselected
    return () => {
      setChatLoading(false);
      if (socket && isConnected && currentGroupIdRef.current) {
        leaveGroup(currentGroupIdRef.current);
        currentGroupIdRef.current = null;
      }
    };
  }, [
    selectedChat,
    currentGroupId,
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    getUnreadCount,
  ]);

  // Reset marked-as-read tracking when chat is deselected
  // This allows marking as read again when reopening the same chat
  useEffect(() => {
    if (selectedChat === null) {
      // When no chat is selected, clear tracking so chats can be marked as read again when reopened
      // Note: We don't clear readGroupsRef here - we want to keep unread at 0 for groups that were opened
      markedAsReadRef.current.clear();
    }
  }, [selectedChat]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMainChat(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChatSelect = (index) => {
    setSelectedChat(index);
    if (isMobile) {
      setShowMainChat(true);
    }
  };

  const handleBackToChats = () => {
    console.log("🔵 handleBackToChats called", {
      isMobile,
      showMainChat,
      showRightSidebarMobile,
      selectedChat,
    });
    // Clear selected chat to remove highlight
    setSelectedChat(null);
    setShowMainChat(false);
    // Close right sidebar if open
    if (showRightSidebarMobile) {
      setShowRightSidebarMobile(false);
    }
    // Clear any active sections
    setActiveInfoSection(null);
  };

  const handleGroupNameClick = () => {
    // Open the first section (contents) to show group info in right sidebar
    if (!activeInfoSection) {
      setActiveInfoSection("contents");
    }
    // On mobile, show the right sidebar and hide main chat
    if (isMobile) {
      setShowRightSidebarMobile(true);
      setShowMainChat(false);
    } else {
      // On desktop, ensure main chat stays visible
      setShowMainChat(true);
    }
  };

  const handleMessageEdited = (messageId, newText) => {
    // Update the message text in the local messages state and calculate new subject
    setMessages(prevMessages => {
      const updatedMessages = prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, text: newText, message: newText } : msg
      );

      // Find the last non-deleted message after the edit
      const newLastMessage = updatedMessages
        .filter(msg => !msg.is_deleted) // Only consider non-deleted messages
        .pop(); // Get the last non-deleted message

      const newSubject = newLastMessage
        ? (newLastMessage.text || (newLastMessage.media && newLastMessage.media.length > 0
            ? getMediaLabel(newLastMessage.media[0].media_type, newLastMessage.media[0].file_name)
            : "Media attachment"))
        : "No messages yet";

      // Update the subject in groupChats for the selected chat
      setGroupChats(prev =>
        prev.map((chat, index) => {
          if (index === selectedChat) {
            return { ...chat, subject: newSubject };
          }
          return chat;
        })
      );

      return updatedMessages;
    });
  };

  const handleMessageDeleted = (messageId) => {
    // Find the message to get its media before marking as deleted
    const messageToDelete = messages.find(msg => msg.id === messageId);

    // If the message has media, remove it from groupInfo to update counts immediately
    if (messageToDelete && messageToDelete.media && messageToDelete.media.length > 0) {
      setGroupInfo(prev => {
        if (!prev) return prev;

        const mediaArray = prev.group?.group_media || prev.group_media || [];
        const updatedMedia = mediaArray.filter(mediaItem => {
          // Remove media items that match the deleted message's media
          return !messageToDelete.media.some(deletedMedia =>
            deletedMedia.media_url === mediaItem.media_url ||
            deletedMedia.id === mediaItem.id
          );
        });

        if (prev.group?.group_media) {
          return {
            ...prev,
            group: {
              ...prev.group,
              group_media: updatedMedia
            }
          };
        } else if (prev.group_media) {
          return {
            ...prev,
            group_media: updatedMedia
          };
        }
        return prev;
      });
    }

    // Mark message as deleted and update subject in one go
    setMessages(prevMessages => {
      const updatedMessages = prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, is_deleted: true } : msg
      );

      // Find the last non-deleted message after the deletion
      const newLastMessage = updatedMessages
        .filter(msg => !msg.is_deleted) // Only consider non-deleted messages
        .pop(); // Get the last non-deleted message

      const newSubject = newLastMessage
        ? (newLastMessage.text || (newLastMessage.media && newLastMessage.media.length > 0
            ? getMediaLabel(newLastMessage.media[0].media_type, newLastMessage.media[0].file_name)
            : "Media attachment"))
        : "No messages yet";

      // Update the subject in groupChats for the selected chat
      setGroupChats(prev =>
        prev.map((chat, index) => {
          if (index === selectedChat) {
            return { ...chat, subject: newSubject };
          }
          return chat;
        })
      );

      return updatedMessages;
    });
  };

  const handleSendMessage = async ({ text, file, mediaCategory }) => {
    if (selectedChat === null) return false;

    const groupId = groupChats[selectedChat]?.id;
    if (!groupId) return false;

    const trimmedText = text?.trim() || "";
    if (!trimmedText && !file) {
      return false;
    }

    const tempId = `temp-${Date.now()}`;
    let localMediaUrl = null;
    let originalName = null;
    const normalizedType = file
      ? deriveMediaCategory(file, mediaCategory)
      : null;
    // Use 'voice_note' if mediaCategory is 'voice_note', otherwise use normalizedType
    // IMPORTANT: Always preserve voice_note even if file type is detected as video/webm
    const finalMediaType =
      mediaCategory === "voice_note"
        ? "voice_note"
        : (file?.type?.startsWith("video/") && mediaCategory === "voice_note")
        ? "voice_note"
        : normalizedType || "document";

    const optimisticMessage = {
      id: tempId,
      sender: user?.name || "You",
      initials: user?.name?.charAt(0)?.toUpperCase() || "ME",
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      text: trimmedText,
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      created_at: new Date().toISOString(),
      senderPhoto: user?.photo || null,
      senderEmail: user?.email || null,
      media: [],
    };

    if (file) {
      localMediaUrl = URL.createObjectURL(file);
      originalName = file.name || "attachment";
      optimisticMessage.media = [
        {
          id: `${tempId}-media`,
          media_url: localMediaUrl,
          media_type: finalMediaType,
          isLocal: true,
          file_name: originalName,
        },
      ];
    }

    setMessages((prev) => [...prev, optimisticMessage]);

    const previewLabel = trimmedText || (file ? getMediaLabel(finalMediaType, originalName) : "");
    setGroupChats((prev) =>
      prev.map((chat, index) => {
        if (index === selectedChat) {
          return { ...chat, subject: previewLabel || chat.subject };
        }
        return chat;
      })
    );

    const formData = new FormData();
    if (trimmedText) {
      formData.append("message", trimmedText);
    }
    if (file) {
      formData.append("media", file);
      // Use 'voice_note' if it's a voice recording, otherwise use normalizedType
      // For uploaded audio files, ensure they're marked as 'audio', not 'voice_note'
      // IMPORTANT: Always preserve voice_note category even if file type is detected as video/webm
      let finalMediaType;
      if (mediaCategory === "voice_note") {
        finalMediaType = "voice_note";
      } else if (
        mediaCategory === "audio" ||
        (file.type?.startsWith("audio/") && mediaCategory !== "voice_note")
      ) {
        finalMediaType = "audio";
      } else if (file.type?.startsWith("video/") && mediaCategory === "voice_note") {
        // Handle case where voice recording is saved as video/webm but should be voice_note
        finalMediaType = "voice_note";
      } else {
        finalMediaType = normalizedType || "document";
      }
      if (finalMediaType) {
        formData.append("media_type", finalMediaType);
      }
      if (file.type) {
        formData.append("file_mime", file.type);
      }
      if (file.name) {
        formData.append("file_name", file.name);
      }
    }

    setIsSendingMessage(true);

    // Check if message contains a link
    const containsLink = trimmedText && /https?:\/\/[^\s<>,;]+/i.test(trimmedText);

    // Helper function to refresh group info
    const refreshGroupInfo = async () => {
      try {
        const infoResponse = await axiosInstance.get(
          `/chat/groups/${groupId}/info`
        );
        if (infoResponse?.data?.success) {
          setGroupInfo(infoResponse.data.data);
        }
      } catch (refreshError) {
        console.warn(
          "⚠️ Failed to refresh group info after sending message:",
          refreshError
        );
      }
    };

    // Helper function for REST API fallback
    const sendViaRestAPI = async () => {
      try {
        console.log("📤 Sending message via REST API...");
        const res = await axiosInstance.post(
          `/chat/groups/${groupId}/messages`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        if (res?.data?.success && res.data.data) {
          const formattedMessage = formatMessage(res.data.data);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === tempId ? formattedMessage : msg))
          );

          // Refresh group info to get updated media list if:
          // 1. A file was sent (and it's not a voice note), OR
          // 2. A link was sent in the message text (backend saves links to media)
          if ((file && finalMediaType !== "voice_note") || containsLink) {
            await refreshGroupInfo();
          }

          if (localMediaUrl) {
            URL.revokeObjectURL(localMediaUrl);
          }
          setIsSendingMessage(false);
          return true;
        }
        throw new Error("Failed to send message");
      } catch (err) {
        console.error("❌ REST API failed to send message:", err);
        smartToast.error(
          err?.response?.data?.message || "Failed to send message"
        );
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        if (localMediaUrl) {
          URL.revokeObjectURL(localMediaUrl);
        }
        setIsSendingMessage(false);
        return false;
      }
    };

    try {
      // If there's a file, always use REST API (Socket.IO doesn't handle file uploads well)
      if (file) {
        return await sendViaRestAPI();
      }

      // For text-only messages, try Socket.IO first
      if (socket && isConnected) {
        console.log("📤 Sending text message via Socket.IO...");
        return new Promise((resolve) => {
          socketSendMessage(groupId, trimmedText, async (ack) => {
            if (ack && ack.ok && ack.data) {
              // Message sent successfully via Socket.IO
              const formattedMessage = formatMessage(ack.data);
              setMessages((prev) => {
                // Check if message already exists (from Socket.IO broadcast)
                const existingIndex = prev.findIndex(
                  (msg) => msg.id === ack.data.id
                );
                if (existingIndex !== -1) {
                  // Message already exists (from Socket.IO broadcast), just update it
                  const updated = [...prev];
                  updated[existingIndex] = formattedMessage;
                  return updated;
                }
                // Replace temp message with real one
                return prev.map((msg) =>
                  msg.id === tempId ? formattedMessage : msg
                );
              });
              console.log("✅ Message sent via Socket.IO");

              // Refresh group info if message contains a link (backend saves links to media)
              if (containsLink) {
                await refreshGroupInfo();
              }

              if (localMediaUrl) {
                URL.revokeObjectURL(localMediaUrl);
              }
              setIsSendingMessage(false);
              resolve(true);
            } else {
              // Socket.IO failed, fallback to REST API
              console.warn(
                "⚠️ Socket.IO send failed, falling back to REST API:",
                ack?.message
              );
              sendViaRestAPI().then(resolve);
            }
          });
        });
      } else {
        // Fallback to REST API if Socket.IO not available
        return await sendViaRestAPI();
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
      smartToast.error(
        err?.response?.data?.message || "Failed to send message"
      );
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      if (localMediaUrl) {
        URL.revokeObjectURL(localMediaUrl);
      }
      setIsSendingMessage(false);
      return false;
    }
  };

  const selectedChatData =
    selectedChat !== null ? groupChats[selectedChat] : null;
  const chatTitle = selectedChatData
    ? selectedChatData.group_name
    : "Group Chat";

  const rawContentResources = useMemo(
    () => groupInfo?.content?.resources || [],
    [groupInfo]
  );
  const contentResources = useMemo(
    () => categorizeResources(rawContentResources),
    [rawContentResources]
  );

  const mediaArray = useMemo(() => {
    if (groupInfo?.group?.group_media) return groupInfo.group.group_media;
    return groupInfo?.group_media || [];
  }, [groupInfo]);

  const groupMediaItems = useMemo(() => {
    console.log('📦 Raw mediaArray from backend:', mediaArray);
    const categorized = categorizeMediaItems(mediaArray);
    console.log('📋 Categorized mediaItems:', categorized);
    return categorized;
  }, [mediaArray]);

  // Combine links from backend (groupMediaItems.links) with links extracted from messages
  // Backend saves links from WhatsApp messages in the media field
  const allLinks = useMemo(() => {
    const backendLinks = groupMediaItems?.links || [];
    const extractedLinks = extractLinksFromMessages(messages);

    // Create a Set to track unique URLs (normalize URLs for comparison)
    const seenUrls = new Set();
    const combinedLinks = [];

    // First, add backend links (these are from WhatsApp messages saved by backend)
    backendLinks.forEach((link) => {
      const url = link.media_url || link.file_url || "";
      if (url) {
        try {
          // Normalize URL for comparison (remove trailing slashes, query params, etc.)
          const normalizedUrl = new URL(url).href.toLowerCase().replace(/\/$/, "");
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            combinedLinks.push({
              ...link,
              isLink: true,
            });
          }
        } catch (e) {
          // If URL parsing fails, still add it if not seen
          if (!seenUrls.has(url.toLowerCase())) {
            seenUrls.add(url.toLowerCase());
            combinedLinks.push({
              ...link,
              isLink: true,
            });
          }
        }
      }
    });

    // Then, add extracted message links (avoiding duplicates)
    extractedLinks.forEach((link) => {
      const url = link.media_url || link.original_url || "";
      if (url) {
        try {
          const normalizedUrl = new URL(url).href.toLowerCase().replace(/\/$/, "");
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            combinedLinks.push(link);
          }
        } catch (e) {
          if (!seenUrls.has(url.toLowerCase())) {
            seenUrls.add(url.toLowerCase());
            combinedLinks.push(link);
          }
        }
      }
    });

    return combinedLinks;
  }, [groupMediaItems?.links, messages]);

  const mediaSummary = useMemo(() => {
    const summary = {
      images: groupMediaItems?.images || [],
      videos: groupMediaItems?.videos || [],
      audio: groupMediaItems?.audio || [],
      files: groupMediaItems?.files || [],
      links: allLinks,
    };
    console.log("Media summary:", summary);
    return summary;
  }, [groupMediaItems, allLinks]);

  const groupMembers = useMemo(() => groupInfo?.members || [], [groupInfo]);

  // Determine user role based on whether current user is the group administrator
  const userRole = useMemo(() => {
    if (!user?.id || !groupInfo) return 'Member';

    const currentUserId = user.id;
    const adminId = groupInfo.group?.administrator_id || groupInfo.administrator_id;

    if (adminId && String(adminId) === String(currentUserId)) {
      return 'Administrator';
    }

    return 'Member';
  }, [user?.id, groupInfo]);

  const calendarEvents = [
    {
      month: "Sep",
      day: "25",
      online: "Online",
      type: "Group Meeting",
      startTime: "8:25",
      startPeriod: "AM",
      endTime: "10:20",
      endPeriod: "AM",
      avatars: ["M", "A"],
    },
    {
      month: "Sep",
      day: "26",
      online: "Online",
      type: "Group Meeting",
      startTime: "8:25",
      startPeriod: "AM",
      endTime: "10:20",
      endPeriod: "AM",
      avatars: ["M", "A"],
    },
  ];

  const currentUser = {
    name: user?.name || "User",
    initials: user?.name?.charAt(0)?.toUpperCase() || "U",
    status: "Online",
  };

  const handleToggleInfoSection = (section) => {
    // Toggle the section
    const newSection = activeInfoSection === section ? null : section;
    setActiveInfoSection(newSection);

    // On mobile, navigate to main chat and show the section
    if (isMobile && newSection) {
      setShowRightSidebarMobile(false);
      setShowMainChat(true);
    }
  };

  if (loading) {
    return (
      <div
        className="home-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading groups...
      </div>
    );
  }

  return (
    <div className="home-container">
      <ChatsPanel
        groupChats={groupChats}
        selectedChat={selectedChat}
        onChatSelect={handleChatSelect}
        isMobile={isMobile}
        showMainChat={showMainChat}
      />

      <MainChat
        key={selectedChatData?.id || "no-chat"}
        messages={selectedChatData ? messages : []}
        chatTitle={
          selectedChat !== null && groupChats[selectedChat]
            ? groupChats[selectedChat]?.name
            : "Select a chat"
        }
        isMobile={isMobile}
        showMainChat={showMainChat}
        onBackToChats={handleBackToChats}
        onSendMessage={handleSendMessage}
        activeSection={activeInfoSection}
        onCloseSection={() => setActiveInfoSection(null)}
        contentResources={contentResources}
        groupMediaItems={groupMediaItems}
        groupMembers={groupMembers}
        currentUserEmail={user?.email}
        groupId={selectedChatData?.id || null}
        onMessageEdited={handleMessageEdited}
        onMessageDeleted={handleMessageDeleted}
        isSendingMessage={isSendingMessage}
        onGroupNameClick={handleGroupNameClick}
        userRole={userRole}
        loading={chatLoading}
      />

      <RightSidebar
        groupInfo={groupInfo}
        calendarEvents={calendarEvents}
        user={currentUser}
        isMobile={isMobile}
        showMainChat={showMainChat}
        activeSection={activeInfoSection}
        onSelectSection={handleToggleInfoSection}
        contentSummary={contentResources}
        mediaSummary={mediaSummary}
        memberCount={groupMembers.length}
        showMobile={showRightSidebarMobile}
        selectedChat={selectedChat}
        onCloseMobile={() => {
          setShowRightSidebarMobile(false);
          // Restore main chat when closing sidebar on mobile
          if (isMobile) {
            setShowMainChat(true);
          }
        }}
        onOpenSidebar={() => {
          console.log(
            "🔵 onOpenSidebar called from GroupChat - opening sidebar menu"
          );
          // Dispatch custom event to trigger AppLayout sidebar
          window.dispatchEvent(new CustomEvent("openMobileSidebar"));
          // Don't close right sidebar - let the sidebar menu open on top
        }}
        onOpenNotifications={() => {
          console.log(
            "🔔 onOpenNotifications called from GroupChat - opening notifications"
          );
          // Dispatch custom event to trigger AppLayout notification panel
          window.dispatchEvent(new CustomEvent("openNotificationPanel"));
          // Don't close right sidebar - let the notification panel open on top
        }}
        unreadNotificationCount={0}
      />
    </div>
  );
}
