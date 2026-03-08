import { useState, useEffect, useRef } from "react";
import { fetchUnreadCount } from "../services/chatsPanelService";

const FETCH_COOLDOWN = 5000;

export function useChatsPanelUnread(axiosInstance, groupChats, selectedChat, socket, isConnected, getUnreadCount) {
  const [unreadMap, setUnreadMap] = useState({});
  const unreadMapRef = useRef({});
  const fetchingRef = useRef(false);
  const endpointExistsRef = useRef(true);
  const lastFetchTimeRef = useRef({});

  useEffect(() => {
    unreadMapRef.current = unreadMap;
  }, [unreadMap]);

  useEffect(() => {
    if (!groupChats?.length) return;
    const now = Date.now();
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
        const lastFetch = lastFetchTimeRef.current[str] || 0;
        if (now - lastFetch < FETCH_COOLDOWN && !isCurrentlySelected) return false;
        if (isCurrentlySelected) return true;
        const cachedCount = unreadMapRef.current[str];
        if (
          parent &&
          Number(parent.unread) > 0 &&
          cachedCount !== undefined &&
          Number(cachedCount) === Number(parent.unread)
        )
          return false;
        return true;
      });

    if (idsToFetch.length === 0) return;

    let token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;
    if (fetchingRef.current) return;
    if (!endpointExistsRef.current) return;

    fetchingRef.current = true;

    (async () => {
      try {
        const results = await Promise.allSettled(
          idsToFetch.map(async (id) => {
            try {
              if (socket && isConnected) {
                return new Promise((resolve) => {
                  getUnreadCount(id, (ack) => {
                    if (ack?.ok) resolve({ id, count: ack.unreadCount || 0 });
                    else fetchUnreadCount(axiosInstance, id).then(resolve);
                  });
                });
              }
              return fetchUnreadCount(axiosInstance, id);
            } catch (e) {
              return { id, count: 0 };
            }
          })
        );

        const resultValues = results
          .filter((r) => r.status === "fulfilled" && r.value?.endpointMissing === true);
        if (resultValues.length > 0) endpointExistsRef.current = false;

        setUnreadMap((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.status === "fulfilled" && r.value && r.value.endpointMissing !== true) {
              const groupIdStr = String(r.value.id);
              const newCount = r.value.count;
              next[groupIdStr] = newCount;
              lastFetchTimeRef.current[groupIdStr] = now;
            }
          });
          return next;
        });
      } finally {
        fetchingRef.current = false;
      }
    })();
  }, [axiosInstance, groupChats, selectedChat, socket, isConnected, getUnreadCount]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const handleNewMessage = (messageData) => {
      if (!messageData?.group_id) return;
      const groupIdStr = String(messageData.group_id);
      const isCurrentlySelected =
        selectedChat !== null &&
        groupChats[selectedChat] &&
        String(groupChats[selectedChat].id) === groupIdStr;
      const currentUser = JSON.parse(
        localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
      );
      const isFromCurrentUser =
        messageData.sender_email === currentUser?.email ||
        messageData.sender_id === currentUser?.id;

      if (!isCurrentlySelected && !isFromCurrentUser) {
        setUnreadMap((prev) => ({
          ...prev,
          [groupIdStr]: (prev[groupIdStr] || 0) + 1,
        }));
      } else if (isCurrentlySelected) {
        setUnreadMap((prev) =>
          prev[groupIdStr] !== 0 ? { ...prev, [groupIdStr]: 0 } : prev
        );
      }
    };
    const handleUnreadCountUpdate = (data) => {
      if (data?.groupId != null && typeof data.unreadCount === "number") {
        const groupIdStr = String(data.groupId);
        setUnreadMap((prev) =>
          prev[groupIdStr] !== data.unreadCount
            ? { ...prev, [groupIdStr]: data.unreadCount }
            : prev
        );
      }
    };
    socket.on("message", handleNewMessage);
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    return () => {
      socket.off("message", handleNewMessage);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
    };
  }, [socket, isConnected, selectedChat, groupChats]);

  useEffect(() => {
    if (!groupChats?.length) return;
    setUnreadMap((prev) => {
      let updated = false;
      const newMap = { ...prev };
      groupChats.forEach((chat) => {
        if (!chat?.id) return;
        const groupIdStr = String(chat.id);
        const parentUnread = Number(chat.unread ?? chat.unread_count ?? chat.unreadCount ?? 0);
        if (parentUnread > (prev[groupIdStr] ?? 0)) {
          newMap[groupIdStr] = parentUnread;
          updated = true;
        }
      });
      return updated ? newMap : prev;
    });
  }, [groupChats]);

  useEffect(() => {
    if (selectedChat !== null && groupChats[selectedChat]) {
      const selectedChatId = String(groupChats[selectedChat].id);
      setUnreadMap((prev) =>
        prev[selectedChatId] > 0 ? { ...prev, [selectedChatId]: 0 } : prev
      );
    }
  }, [selectedChat, groupChats]);

  return [unreadMap, setUnreadMap];
}
