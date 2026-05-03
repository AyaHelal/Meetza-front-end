import { useState, useCallback, useEffect, useRef, useContext } from "react";
import { getMessages, getGroupInfo, markAllMessagesRead } from "../services/groupChatService";
import { formatMessage } from "../utils/groupChatFormatters";
import { AuthContext } from "../../../context/AuthContext";

/**
 * Messages and group info for the selected chat. Fetches when selectedChat/currentGroupId changes.
 * Refs (readGroupsRef, markedAsReadRef, currentGroupIdRef, joinedGroupsRef) are passed from parent.
 */
export function useGroupChatMessages(
  api,
  selectedChat,
  groupChats,
  currentGroupId,
  socket,
  isConnected,
  joinGroup,
  leaveGroup,
  getUnreadCount,
  markAllMessagesReadFn,
  setGroupChats,
  readGroupsRef,
  markedAsReadRef,
  currentGroupIdRef,
  joinedGroupsRef,
  setUnreadGroupChatCount
) {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

  const loadMoreMessages = useCallback(async () => {
    if (selectedChat === null || loadingMoreMessages || !hasMoreMessages || !api) return;
    const groupId = groupChats[selectedChat]?.id;
    if (!groupId) return;
    try {
      setLoadingMoreMessages(true);
      const offset = messages.length;
      const raw = await getMessages(api, groupId, 50, offset);
      const memberOpts = { members: groupInfo?.members ?? [] };
      const newMessages = raw.map((msg) => formatMessage(msg, memberOpts));
      setMessages((prev) => [...newMessages, ...prev]);
      setHasMoreMessages(newMessages.length === 50);
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [api, selectedChat, groupChats, messages.length, hasMoreMessages, loadingMoreMessages, groupInfo?.members]);

  // Fetch messages and group info when selected chat changes
  useEffect(() => {
    if (selectedChat === null || !currentGroupId) {
      setChatLoading(false);
      setMessages([]);
      setGroupInfo(null);
      return;
    }

    const groupId = currentGroupId;
    const groupIdStr = String(groupId);

    let hasCache = false;
    const cachedInfo = localStorage.getItem(`chat_info_${groupId}_${user?.id || 'guest'}`);
    const cachedMessages = localStorage.getItem(`chat_messages_${groupId}_${user?.id || 'guest'}`);

    if (cachedInfo && cachedMessages) {
      try {
        const parsedInfo = JSON.parse(cachedInfo);
        const parsedMessages = JSON.parse(cachedMessages);
        setGroupInfo(parsedInfo);
        setMessages(parsedMessages);
        setHasMoreMessages(parsedMessages.length >= 50);
        hasCache = true;
      } catch (e) {
        console.error("Failed to parse chat cache", e);
      }
    }

    if (!hasCache) {
      setMessages([]);
      setGroupInfo(null);
      setChatLoading(true);
    } else {
      setChatLoading(false);
    }

    const fetchMessagesAndInfo = async () => {
      try {
        const groupIdStr = String(groupId);
        const groupObj = groupChats.find(g => String(g.id) === groupIdStr);
        const groupUnread = Number(groupObj?.unread ?? groupObj?.unread_count ?? 0);

        if (groupUnread > 0 && !readGroupsRef?.current?.has(groupIdStr)) {
          setUnreadGroupChatCount?.((prev) => Math.max(0, prev - groupUnread));
        }

        readGroupsRef?.current?.add(groupIdStr);
        setGroupChats((prev) =>
          prev.map((g) => (String(g.id) === groupIdStr ? { ...g, unread: 0 } : g))
        );

        if (socket && isConnected && markAllMessagesReadFn) {
          markAllMessagesReadFn(groupId, (ack) => {
            if (ack?.ok) {
              markedAsReadRef?.current?.add(groupIdStr);
              const unreadCount = ack.unreadCount ?? 0;
              setGroupChats((prev) =>
                prev.map((g) =>
                  String(g.id) === groupIdStr ? { ...g, unread: unreadCount } : g
                )
              );
            } else {
              api && markAllMessagesRead(api, groupId).then(() => {
                markedAsReadRef?.current?.add(groupIdStr);
                setGroupChats((prev) =>
                  prev.map((g) => (String(g.id) === groupIdStr ? { ...g, unread: 0 } : g))
                );
              }).catch(() => {
                markedAsReadRef?.current?.add(groupIdStr);
                setGroupChats((prev) =>
                  prev.map((g) => (String(g.id) === groupIdStr ? { ...g, unread: 0 } : g))
                );
              });
            }
          });
        } else if (api) {
          await markAllMessagesRead(api, groupId);
          markedAsReadRef?.current?.add(groupIdStr);
          setGroupChats((prev) =>
            prev.map((g) => (String(g.id) === groupIdStr ? { ...g, unread: 0 } : g))
          );
        }

        const [info, rawMessages] = await Promise.all([
          getGroupInfo(api, groupId),
          getMessages(api, groupId, 50, 0)
        ]);

        setGroupInfo(info);
        const members = info?.members ?? [];
        const formattedMessages = rawMessages.map((msg) => formatMessage(msg, { members }));
        setMessages(formattedMessages);
        setHasMoreMessages(rawMessages.length === 50);

        localStorage.setItem(`chat_info_${groupId}_${user?.id || 'guest'}`, JSON.stringify(info));
        localStorage.setItem(`chat_messages_${groupId}_${user?.id || 'guest'}`, JSON.stringify(formattedMessages));
      } catch (error) {
        console.error("Error fetching messages/info:", error);
      } finally {
        if (!hasCache) {
          setChatLoading(false);
        }
      }
    };

    const groupIdToLeave = groupId;
    fetchMessagesAndInfo();
    currentGroupIdRef.current = groupId;

    if (socket && isConnected && joinedGroupsRef && !joinedGroupsRef.current.has(groupIdStr)) {
      joinGroup(groupId, (ack) => {
        if (ack?.ok) joinedGroupsRef?.current?.add(groupIdStr);
      });
    }

    if (socket && isConnected && getUnreadCount) {
      getUnreadCount(groupId, (ack) => {
        if (ack?.ok && ack.unreadCount !== undefined) {
          setGroupChats((prev) =>
            prev.map((g) =>
              String(g.id) === String(currentGroupId)
                ? { ...g, unread: ack.unreadCount }
                : g
            )
          );
        }
      });
    }

    return () => {
      setChatLoading(false);
      if (socket && isConnected) {
        leaveGroup(groupIdToLeave);
        if (currentGroupIdRef) currentGroupIdRef.current = null;
      }
    };
  }, [
    selectedChat,
    currentGroupId,
    api,
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    getUnreadCount,
    markAllMessagesReadFn,
    setGroupChats,
    readGroupsRef,
    markedAsReadRef,
    currentGroupIdRef,
    joinedGroupsRef,
    user?.id,
  ]);

  return {
    messages,
    setMessages,
    groupInfo,
    setGroupInfo,
    chatLoading,
    hasMoreMessages,
    loadingMoreMessages,
    loadMoreMessages,
  };
}
