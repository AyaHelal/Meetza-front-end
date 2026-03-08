import { useState, useCallback, useEffect, useRef } from "react";
import { getMessages, getGroupInfo, markAllMessagesRead } from "../services/groupChatService";
import { formatMessage } from "../utils/groupChatFormatters";

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
  joinedGroupsRef
) {
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
      const newMessages = raw.map((msg) => formatMessage(msg));
      setMessages((prev) => [...newMessages, ...prev]);
      setHasMoreMessages(newMessages.length === 50);
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [api, selectedChat, groupChats, messages.length, hasMoreMessages, loadingMoreMessages]);

  // Fetch messages and group info when selected chat changes
  useEffect(() => {
    if (selectedChat === null || !currentGroupId) {
      setChatLoading(false);
      return;
    }

    const groupId = currentGroupId;
    const groupIdStr = String(groupId);

    const fetchMessagesAndInfo = async () => {
      try {
        setChatLoading(true);
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

        const rawMessages = await getMessages(api, groupId, 50, 0);
        setMessages(rawMessages.map((msg) => formatMessage(msg)));
        setHasMoreMessages(rawMessages.length === 50);

        const info = await getGroupInfo(api, groupId);
        setGroupInfo(info);
      } catch (error) {
        console.error("Error fetching messages/info:", error);
      } finally {
        setChatLoading(false);
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
