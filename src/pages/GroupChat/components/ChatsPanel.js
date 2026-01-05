import React from "react";
import { MagnifyingGlass, Users } from "@phosphor-icons/react";
import { useSocket } from "../../../context/SocketContext";
import axiosInstance from "../../../API/axiosInstance";
import ChatItem from "./ChatItem";
import "./ChatsPanel.css";

const ChatsPanel = ({
  groupChats,
  selectedChat,
  onChatSelect,
  isMobile,
  showMainChat,
  activeNav,
  setActiveNav,
}) => {
  const { socket, isConnected, getUnreadCount } = useSocket();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  // Removed unreadGroups and loadingUnread - we now filter mergedChats instead

  // local cache of per-group unread counts fetched from API or Socket.IO
  const [unreadMap, setUnreadMap] = React.useState({});
  const unreadMapRef = React.useRef({}); // Keep ref in sync for access without dependencies
  const fetchingRef = React.useRef(false);
  const endpointExistsRef = React.useRef(true); // Track if unread-count endpoint exists
  const lastFetchTimeRef = React.useRef({}); // Track when each group was last fetched
  const FETCH_COOLDOWN = 5000; // Only fetch each group once every 5 seconds

  // Keep ref in sync with state
  React.useEffect(() => {
    unreadMapRef.current = unreadMap;
  }, [unreadMap]);

  // Cache for last message previews (for media messages)
  const [messagePreviews, setMessagePreviews] = React.useState({});
  const fetchingPreviewsRef = React.useRef(false);
  const fetchedPreviewsRef = React.useRef(new Set()); // Track which groups have been fetched

  // Fetch unread counts for group IDs that don't already have a non-zero value in the parent
  React.useEffect(() => {
    if (!groupChats || groupChats.length === 0) return;

    const now = Date.now();

    // build list of ids to fetch: always fetch for currently selected chat to ensure fresh data
    // For other chats, prefer gaps where parent's unread is missing or zero
    const idsToFetch = groupChats
      .map((g) => g?.id)
      .filter(Boolean)
      .filter((id) => {
        const str = String(id);
        const parent = groupChats.find((g) => String(g.id) === str);
        const isCurrentlySelected =
          selectedChat !== null &&
          groupChats[selectedChat] &&
          String(groupChats[selectedChat].id) === str;

        // Check if we recently fetched this group (cooldown)
        const lastFetch = lastFetchTimeRef.current[str] || 0;
        const timeSinceLastFetch = now - lastFetch;
        if (timeSinceLastFetch < FETCH_COOLDOWN && !isCurrentlySelected) {
          return false; // Skip if recently fetched (unless it's the selected chat)
        }

        // Always fetch for currently selected chat to ensure fresh data
        if (isCurrentlySelected) return true;

        // Only fetch if we don't have a cached value OR if parent unread doesn't match
        // This prevents unnecessary requests when we already have fresh data
        // Use ref to avoid dependency on unreadMap
        const cachedCount = unreadMapRef.current[str];
        if (
          parent &&
          Number(parent.unread) > 0 &&
          cachedCount !== undefined &&
          Number(cachedCount) === Number(parent.unread)
        ) {
          return false; // We already have matching fresh data
        }
        return true; // Fetch to get fresh data
      });

    if (idsToFetch.length === 0) return;

    // Make sure we have an auth token — unread-count is typically a protected endpoint
    let token = localStorage.getItem("token");
    if (!token) token = sessionStorage.getItem("token");
    if (!token) {
      console.warn(
        "ChatsPanel: no auth token found - skipping unread-count fetch"
      );
      fetchingRef.current = false;
      return;
    }
    // Only log if there are groups to fetch (reduce console noise)
    if (idsToFetch.length > 0) {
      console.debug("ChatsPanel: will fetch unread-count for ids", idsToFetch);
    }
    if (fetchingRef.current) return; // avoid parallel fetches

    // Skip if endpoint doesn't exist (we got 404s before)
    if (!endpointExistsRef.current) {
      console.debug(
        "ChatsPanel: Skipping unread-count fetch - endpoint returns 404"
      );
      return;
    }

    fetchingRef.current = true;

    // Helper function to fetch via REST API
    const fetchUnreadCountViaAPI = async (id) => {
      try {
        const cacheBuster = Date.now();
        const res = await axiosInstance.get(`/chat/groups/${id}/unread-count`, {
          params: { _cacheBust: cacheBuster },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        // If server returns 304 Not Modified, try again with a new cache buster
        if (res && res.status === 304) {
          console.debug(
            "ChatsPanel: unread-count 304 for",
            id,
            "- retrying with new cacheBuster"
          );
          try {
            const res2 = await axiosInstance.get(
              `/chat/groups/${id}/unread-count`,
              {
                params: { _cacheBust: Date.now() },
                headers: {
                  "Cache-Control": "no-cache, no-store, must-revalidate",
                  Pragma: "no-cache",
                  Expires: "0",
                },
              }
            );
            if (res2 && res2.status === 200) {
              console.debug(
                "ChatsPanel: unread-count cache-bust success for",
                id,
                res2.data
              );
              // Use res2 as the response
              Object.defineProperty(res, "data", {
                value: res2.data,
                configurable: true,
              });
              Object.defineProperty(res, "status", {
                value: res2.status,
                configurable: true,
              });
            }
          } catch (e2) {
            // Silently handle cache-bust retry failures
            if (e2?.response?.status !== 404) {
              console.warn(
                "ChatsPanel: cache-bust retry failed",
                id,
                e2?.response?.status || e2.message || e2
              );
            }
          }
        }
        const payload = res?.data;
        let c = 0;
        // payload may be empty if server replied 304; handle gracefully
        if (payload) {
          // Support multiple response shapes used by different backends
          if (typeof payload.data === "number") c = payload.data;
          else if (payload.data && typeof payload.data.count === "number")
            c = payload.data.count;
          else if (payload.data && typeof payload.data.unread === "number")
            c = payload.data.unread;
          else if (
            payload.data &&
            typeof payload.data.unread_count === "number"
          )
            c = payload.data.unread_count;
          else if (payload.data && typeof payload.data.unreadCount === "number")
            c = payload.data.unreadCount;
          else if (typeof payload.count === "number") c = payload.count;
          else c = Number(payload.data) || 0;
        }
        // Only log if count is non-zero (reduce console noise)
        if (c > 0) {
          console.debug(`ChatsPanel: Unread count for group ${id}:`, {
            payload,
            parsedCount: c,
          });
        }
        return { id, count: c };
      } catch (e) {
        // Silently handle 404 errors (endpoint might not exist)
        if (e?.response?.status === 404) {
          // Mark endpoint as not existing if we get 404
          endpointExistsRef.current = false;
        } else if (e?.response?.status !== 404) {
          console.warn(
            `ChatsPanel: Error fetching unread-count for group ${id}:`,
            e?.response?.status || e?.message
          );
        }
        return { id, count: 0 };
      }
    };

    (async () => {
      try {
        const results = await Promise.allSettled(
          idsToFetch.map(async (id) => {
            try {
              // Prefer Socket.IO if available and connected
              if (socket && isConnected) {
                return new Promise((resolve) => {
                  getUnreadCount(id, (ack) => {
                    if (ack && ack.ok) {
                      const count = ack.unreadCount || 0;
                      // Only log if count changed or is non-zero (reduce console noise)
                      if (
                        count > 0 ||
                        unreadMapRef.current[String(id)] !== count
                      ) {
                        console.debug(
                          `ChatsPanel: Socket.IO unread count for group ${id}:`,
                          count
                        );
                      }
                      resolve({ id, count });
                    } else {
                      // Fallback to REST API if Socket.IO fails
                      fetchUnreadCountViaAPI(id).then(resolve);
                    }
                  });
                });
              } else {
                // Use REST API if Socket.IO not available
                return fetchUnreadCountViaAPI(id);
              }
            } catch (e) {
              console.warn(
                `ChatsPanel: Error fetching unread-count for group ${id}:`,
                e?.response?.status || e?.message
              );
              return { id, count: 0 };
            }
          })
        );

        setUnreadMap((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.status === "fulfilled" && r.value) {
              const groupIdStr = String(r.value.id);
              const newCount = r.value.count;
              // Only update if the value actually changed to avoid unnecessary re-renders
              if (prev[groupIdStr] !== newCount) {
                // Always update unreadMap with the latest value from API
                // The merging logic will handle whether to show it or not
                // This allows new messages to show badges even if chat was previously read
                // Only log if count is non-zero or changed significantly (reduce console noise)
                if (
                  newCount > 0 ||
                  Math.abs((prev[groupIdStr] || 0) - newCount) > 0
                ) {
                  console.debug(
                    "ChatsPanel: updating unreadMap",
                    r.value.id,
                    "from",
                    prev[groupIdStr] || 0,
                    "to",
                    newCount
                  );
                }
                next[groupIdStr] = newCount;
                // Update last fetch time
                lastFetchTimeRef.current[groupIdStr] = now;
              } else {
                // Still update last fetch time even if value didn't change
                lastFetchTimeRef.current[groupIdStr] = now;
              }
            }
          });
          return next;
        });
      } catch (e) {
        console.warn("Error fetching unread-counts in ChatsPanel", e);
      } finally {
        fetchingRef.current = false;
      }
    })();
  }, [groupChats, selectedChat, socket, isConnected, getUnreadCount]); // Removed unreadMap from dependencies to prevent infinite loop

  // Listen for Socket.IO events to update unread counts in real-time
  React.useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new messages to update unread counts
    const handleNewMessage = (messageData) => {
      if (messageData && messageData.group_id) {
        const groupIdStr = String(messageData.group_id);
        const isCurrentlySelected =
          selectedChat !== null &&
          groupChats[selectedChat] &&
          String(groupChats[selectedChat].id) === groupIdStr;

        // Check if message is from current user
        const currentUser = JSON.parse(
          localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
        );
        const isFromCurrentUser =
          messageData.sender_email === currentUser?.email ||
          messageData.sender_id === currentUser?.id;

        // Only increment unread if it's not the currently selected chat AND not from current user
        if (!isCurrentlySelected && !isFromCurrentUser) {
          setUnreadMap((prev) => {
            const currentCount = prev[groupIdStr] || 0;
            const newCount = currentCount + 1;
            console.log(
              `ChatsPanel: Incrementing unread for group ${groupIdStr}: ${currentCount} -> ${newCount}`
            );
            return { ...prev, [groupIdStr]: newCount };
          });
        } else if (isCurrentlySelected) {
          // If it's the current chat, ensure unread is 0
          setUnreadMap((prev) => {
            if (prev[groupIdStr] !== 0) {
              console.log(
                `ChatsPanel: Clearing unread for selected group ${groupIdStr}`
              );
              return { ...prev, [groupIdStr]: 0 };
            }
            return prev;
          });
        }
      }
    };

    // Listen for unread count updates from server
    const handleUnreadCountUpdate = (data) => {
      if (data && data.groupId && typeof data.unreadCount === "number") {
        const groupIdStr = String(data.groupId);
        setUnreadMap((prev) => {
          // Only update if value changed
          if (prev[groupIdStr] !== data.unreadCount) {
            return { ...prev, [groupIdStr]: data.unreadCount };
          }
          return prev;
        });
      }
    };

    socket.on("message", handleNewMessage);
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);

    return () => {
      socket.off("message", handleNewMessage);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
    };
  }, [socket, isConnected, selectedChat, groupChats]);

  // Sync unreadMap with parent groupChats unread values
  // This ensures that when GroupChat updates unread counts, ChatsPanel reflects it
  React.useEffect(() => {
    if (!groupChats || groupChats.length === 0) return;

    setUnreadMap((prev) => {
      let updated = false;
      const newMap = { ...prev };

      groupChats.forEach((chat) => {
        if (!chat || !chat.id) return;
        const groupIdStr = String(chat.id);
        const parentUnread = Number(
          chat.unread ?? chat.unread_count ?? chat.unreadCount ?? 0
        );
        const currentUnread = Number(prev[groupIdStr] ?? 0);

        // If parent has a higher unread count, update unreadMap to match
        // This ensures parent updates (from Socket.IO messages) are reflected
        if (parentUnread > currentUnread) {
          newMap[groupIdStr] = parentUnread;
          updated = true;
          console.log(
            `ChatsPanel: Syncing unreadMap for group ${groupIdStr}: ${currentUnread} -> ${parentUnread} (from parent)`
          );
        }
      });

      return updated ? newMap : prev;
    });
  }, [groupChats]);

  // Clear unreadMap for currently selected chat to ensure badge disappears immediately
  React.useEffect(() => {
    if (selectedChat !== null && groupChats[selectedChat]) {
      const selectedChatId = String(groupChats[selectedChat].id);
      setUnreadMap((prev) => {
        if (prev[selectedChatId] > 0) {
          console.debug(
            `ChatsPanel: Clearing unreadMap for selected chat ${selectedChatId}`
          );
          return { ...prev, [selectedChatId]: 0 };
        }
        return prev;
      });
    }
  }, [selectedChat, groupChats]);

  // Note: We no longer fetch unread groups from API
  // Instead, we filter mergedChats to show only groups with unread > 0
  // This is more reliable and ensures consistency with the rest of the UI

  // Fetch last message for groups that don't have last_message or subject
  React.useEffect(() => {
    if (!groupChats || groupChats.length === 0) return;
    if (fetchingPreviewsRef.current) return;

    // Find groups that need preview fetching (have last_message_at but no last_message/subject)
    const groupsToFetch = groupChats.filter((chat) => {
      const chatIdStr = String(chat.id);
      const hasDate =
        chat.last_message_at || chat.date || chat.last_message_time;
      const hasMessage = chat.last_message && chat.last_message.trim();
      const hasSubject =
        chat.subject &&
        chat.subject.trim() &&
        chat.subject !== "No messages yet" &&
        chat.subject !== "Media attachment";
      const alreadyFetched = fetchedPreviewsRef.current.has(chatIdStr);

      return hasDate && !hasMessage && !hasSubject && !alreadyFetched;
    });

    if (groupsToFetch.length === 0) return;

    fetchingPreviewsRef.current = true;
    console.log(
      "📥 Fetching last messages for groups:",
      groupsToFetch.map((g) => g.id)
    );

    (async () => {
      try {
        const results = await Promise.allSettled(
          groupsToFetch.map(async (chat) => {
            try {
              const res = await axiosInstance.get(
                `/chat/groups/${chat.id}/messages?limit=1`
              );
              if (
                res?.data?.success &&
                res.data.data &&
                res.data.data.length > 0
              ) {
                const lastMsg = res.data.data[0];

                // Check if message has text
                if (lastMsg.message && lastMsg.message.trim()) {
                  return { id: chat.id, preview: lastMsg.message };
                }

                // Check if message has media
                if (
                  lastMsg.media &&
                  Array.isArray(lastMsg.media) &&
                  lastMsg.media.length > 0
                ) {
                  const media = lastMsg.media[0];
                  const mediaType = media?.media_type || media?.file_type || "";
                  const mediaUrl = media?.media_url || media?.file_url || "";

                  let preview = "📎 Attachment";

                  if (mediaType) {
                    const type = String(mediaType).toLowerCase();
                    if (type.includes("image") || type === "photo") {
                      preview = "📷 Photo";
                    } else if (type.includes("video")) {
                      preview = "🎥 Video";
                    } else if (
                      type.includes("audio") ||
                      type === "voice" ||
                      type === "voice_note"
                    ) {
                      preview = "🎤 Audio";
                    } else if (type.includes("file") || type === "document") {
                      preview = "📄 Document";
                    }
                  } else if (mediaUrl) {
                    // Try to determine from URL extension
                    const urlMatch = mediaUrl.match(/\.([a-z0-9]+)(\?|$)/i);
                    const extension = urlMatch ? urlMatch[1].toLowerCase() : "";

                    if (
                      [
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "bmp",
                        "webp",
                        "svg",
                        "avif",
                      ].includes(extension)
                    ) {
                      preview = "📷 Photo";
                    } else if (
                      ["mp4", "mov", "webm", "mkv", "avi"].includes(extension)
                    ) {
                      preview = "🎥 Video";
                    } else if (
                      ["mp3", "wav", "m4a", "aac", "ogg", "webm"].includes(
                        extension
                      )
                    ) {
                      preview = "🎤 Audio";
                    } else if (
                      [
                        "pdf",
                        "doc",
                        "docx",
                        "xls",
                        "xlsx",
                        "ppt",
                        "pptx",
                        "txt",
                      ].includes(extension)
                    ) {
                      preview = "📄 Document";
                    }
                  }

                  return { id: chat.id, preview };
                }
              }
              return { id: chat.id, preview: null };
            } catch (err) {
              console.warn(
                `⚠️ Failed to fetch last message for group ${chat.id}:`,
                err
              );
              return { id: chat.id, preview: null };
            }
          })
        );

        const newPreviews = {};
        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            const chatIdStr = String(result.value.id);
            fetchedPreviewsRef.current.add(chatIdStr);
            if (result.value.preview) {
              newPreviews[chatIdStr] = result.value.preview;
            }
          }
        });

        if (Object.keys(newPreviews).length > 0) {
          setMessagePreviews((prev) => ({ ...prev, ...newPreviews }));
        }
      } catch (e) {
        console.warn("Error fetching message previews:", e);
      } finally {
        fetchingPreviewsRef.current = false;
      }
    })();
  }, [groupChats]); // Removed messagePreviews from dependencies to avoid infinite loop

  // Prefer server-provided parent value unless the per-group unreadMap returns a positive count
  const mergedChats = groupChats.map((c, index) => {
    const parentVal = Number(c.unread ?? c.unread_count ?? c.unreadCount ?? 0);
    const fetched = Number(unreadMap[String(c.id)] ?? 0);
    const isCurrentlySelected = selectedChat === index;

    // Priority logic for unread count:
    // 1. If currently selected, always show 0
    // 2. Use the MAXIMUM of parentVal and fetched to ensure we show unread if either source has it
    //    This ensures that if parent updates with new unread count, it's shown immediately
    //    And if unreadMap has a value, it's also respected
    // 3. If both are 0, show 0
    let unread;
    if (isCurrentlySelected) {
      unread = 0;
    } else {
      // Use the maximum of both values to ensure we show unread if either source has it
      // This handles cases where:
      // - Parent updates first (from Socket.IO message in GroupChat)
      // - unreadMap updates first (from Socket.IO message in ChatsPanel)
      // - Both update and we want to show the highest value
      unread = Math.max(parentVal, fetched);
    }

    // Debug log for unread count merging (only log when there's a discrepancy or unread > 0)
    if (parentVal !== fetched || unread > 0) {
      console.log(`ChatsPanel mergedChats for group ${c.id}:`, {
        parentVal,
        fetched,
        isCurrentlySelected,
        finalUnread: unread,
        originalChat: c,
      });
    }

    return { ...c, unread };
  });

  // Filter mergedChats to show only unread groups when unread tab is active
  // This is more reliable than using the API endpoint and ensures consistency
  const chatsToDisplay = React.useMemo(() => {
    if (activeTab === "unread") {
      // Filter mergedChats to show only groups with unread > 0
      const unreadOnly = mergedChats.filter((chat) => {
        const unreadCount = Number(
          chat.unread ?? chat.unread_count ?? chat.unreadCount ?? 0
        );
        return unreadCount > 0;
      });
      console.log(
        `ChatsPanel: Filtered ${unreadOnly.length} unread groups from ${mergedChats.length} total groups`
      );
      return unreadOnly;
    }
    return mergedChats;
  }, [activeTab, mergedChats]);

  const filteredChats = chatsToDisplay.filter((chat) => {
    if (!chat) return false;
    const chatName = (chat.name || chat.group_name || "").toLowerCase();
    const chatSubject = (chat.subject || "").toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      chatName.includes(searchLower) || chatSubject.includes(searchLower);
    return matchesSearch;
  });

  return (
    <>
      <div
        className={`chats-panel rounded-4 shadow-sm ${isMobile && showMainChat ? "mobile-hidden" : ""
          }`}
      >
        <div className="chats-header">
          <h2 className="fw-semibold">Group Chats</h2>
        </div>
        <div className="chats-search">
          <MagnifyingGlass size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="chats-tabs">
          <button
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={`tab ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
          </button>
        </div>
        <div className="chats-list">
          {filteredChats.length === 0 ? (
            <div className="no-chats-container">
              {groupChats.length === 0 ? (
                <div className="no-groups-message">
                  <div className="no-groups-icon">
                    <Users size={64} weight="duotone" />
                  </div>
                  <p className="no-groups-text">No groups yet</p>
                  <p className="no-groups-subtext">Please go to groups page and join groups</p>
                </div>
              ) : (
                <img
                  src="/assets/GroupChat.png"
                  alt="No chats"
                  className="no-chats-image"
                />
              )}
            </div>
          ) : (
            filteredChats.map((chat, index) => {
              // Find the original index in groupChats array
              const chatId = chat.id || chat.group_id;
              const originalIndex = groupChats.findIndex(
                (g) => String(g.id) === String(chatId)
              );

              // Format date properly
              let formattedDate = "";
              const dateField =
                chat.date ||
                chat.last_message_at ||
                chat.last_message_time ||
                chat.updated_at;
              if (dateField) {
                try {
                  const dateObj = new Date(dateField);
                  if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    });
                  }
                } catch (e) {
                  console.warn("Error formatting date:", e);
                }
              }

              // Get preview from cache if available
              const cachedPreview = messagePreviews[String(chatId)];

              // Format chat data to match ChatItem expected structure
              const formattedChat = {
                ...chat,
                name: chat.name || chat.group_name,
                subject:
                  cachedPreview ||
                  chat.subject ||
                  chat.last_message ||
                  "No messages yet",
                avatar:
                  chat.avatar ||
                  (chat.name || chat.group_name)?.charAt(0)?.toUpperCase() ||
                  "G",
                avatarImage: chat.avatarImage || chat.group_photo || chat.photo,
                date: formattedDate || chat.date || "",
                unread:
                  chat.unread ?? chat.unread_count ?? chat.unreadCount ?? 0,
              };

              return (
                <ChatItem
                  key={chatId || index}
                  chat={formattedChat}
                  isActive={
                    selectedChat === originalIndex && originalIndex !== -1
                  }
                  onClick={() => {
                    if (originalIndex !== -1) {
                      onChatSelect(originalIndex, {
                        fromPanel: true,
                        unreadCount: Number(formattedChat.unread || 0),
                      });
                      setUnreadMap((prev) => ({
                        ...prev,
                        [String(chatId)]: 0,
                      }));
                    } else {
                      // If chat not found in groupChats, we might need to refresh the list
                      console.warn("Chat not found in groupChats, ID:", chatId);
                    }
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default ChatsPanel;
