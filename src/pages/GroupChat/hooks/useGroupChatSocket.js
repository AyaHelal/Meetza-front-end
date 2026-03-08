import { useEffect } from "react";
import { formatMessage, getMediaLabel } from "../utils/groupChatFormatters";

const GROUP_EVENT_NAMES = [
  "groupCreated",
  "group_created",
  "newGroup",
  "new_group",
  "group:add",
  "group",
  "groupUpdated",
];

/**
 * Socket listeners: new message, group events, and join/leave all groups.
 */
export function useGroupChatSocket(
  socket,
  isConnected,
  groupChats,
  setGroupChats,
  setMessages,
  currentGroupIdRef,
  userRef,
  markAllMessagesReadRef,
  joinedGroupsRef,
  joinGroup,
  leaveGroup,
  refreshGroupsList,
  selectedChat,
  setSelectedChat
) {
  // Join all groups when socket and groupChats are ready
  useEffect(() => {
    if (!socket || !isConnected || groupChats.length === 0 || !joinedGroupsRef) return;
    const currentGroups = [...groupChats];
    const groupsToJoin = currentGroups.map((g) => ({ id: g.id, idStr: String(g.id) }));
    const groupsJoinedInThisEffect = new Set();

    groupsToJoin.forEach(({ id, idStr }) => {
      if (joinedGroupsRef.current.has(idStr)) return;
      joinGroup(id, (ack) => {
        if (ack?.ok) {
          joinedGroupsRef.current.add(idStr);
          groupsJoinedInThisEffect.add(idStr);
        }
      });
    });

    return () => {
      groupsToJoin.forEach(({ id, idStr }) => {
        if (groupsJoinedInThisEffect.has(idStr)) {
          leaveGroup(id);
          joinedGroupsRef.current.delete(idStr);
        }
      });
    };
  }, [socket, isConnected, groupChats, joinGroup, leaveGroup, joinedGroupsRef]);

  // Message listener
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (messageData) => {
      const messageGroupId = String(
        messageData.group_id || messageData.groupId || messageData.group || ""
      );
      if (
        !messageData ||
        !messageGroupId ||
        messageGroupId === "undefined" ||
        messageGroupId === "null"
      )
        return;

      const isForCurrentGroup =
        currentGroupIdRef?.current &&
        String(currentGroupIdRef.current) === messageGroupId;

      if (isForCurrentGroup) {
        const formattedMessage = formatMessage(messageData);
        setMessages((prev) => {
          const existingIndex = prev.findIndex((msg) => {
            if (msg.id === messageData.id) return true;
            if (msg.id?.startsWith("temp-") && messageData.id) {
              const currentUser = userRef?.current;
              const isFromCurrentUser =
                messageData.sender_email === currentUser?.email ||
                messageData.sender_id === currentUser?.id;
              if (isFromCurrentUser && msg.text === messageData.message) {
                const timeDiff = Math.abs(
                  new Date(msg.created_at).getTime() -
                    new Date(messageData.created_at).getTime()
                );
                if (timeDiff < 10000) return true;
              }
            }
            return false;
          });
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = formattedMessage;
            return updated;
          }
          return [...prev, formattedMessage];
        });

        const currentUser = userRef?.current;
        const isFromCurrentUser =
          messageData.sender_email === currentUser?.email ||
          messageData.sender_id === currentUser?.id;
        if (
          !isFromCurrentUser &&
          currentGroupIdRef?.current &&
          markAllMessagesReadRef?.current
        ) {
          markAllMessagesReadRef.current(currentGroupIdRef.current, (ack) => {
            if (ack?.ok) {
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
      }

      if (
        messageGroupId &&
        messageGroupId !== "undefined" &&
        messageGroupId !== "null"
      ) {
        setGroupChats((prev) =>
          prev.map((group) => {
            if (String(group.id) !== messageGroupId) return group;
            const isCurrentGroup =
              String(group.id) === String(currentGroupIdRef?.current);
            const currentUser = userRef?.current;
            const isFromCurrentUser =
              messageData.sender_email === currentUser?.email ||
              messageData.sender_id === currentUser?.id;
            let newUnread = group.unread || 0;
            if (isCurrentGroup) newUnread = 0;
            else if (!isFromCurrentUser) newUnread = (group.unread || 0) + 1;
            const messageSubject = messageData.message || messageData.text;
            const subject =
              messageSubject ||
              (messageData.media?.length > 0
                ? getMediaLabel(
                    messageData.media[0].media_type,
                    messageData.media[0].file_name
                  )
                : "No messages yet");
            return { ...group, subject, unread: newUnread };
          })
        );
      }
    };

    socket.on("message", handleNewMessage);
    return () => socket.off("message", handleNewMessage);
  }, [
    socket,
    isConnected,
    setMessages,
    setGroupChats,
    currentGroupIdRef,
    userRef,
    markAllMessagesReadRef,
  ]);

  // Group events → refresh list
  useEffect(() => {
    if (!socket || !isConnected) return;
    const handleGroupEvent = () => {
      refreshGroupsList(
        false,
        selectedChat,
        groupChats,
        setSelectedChat
      ).catch((err) => console.error("Error handling group event:", err));
    };
    GROUP_EVENT_NAMES.forEach((name) => socket.on(name, handleGroupEvent));
    return () => {
      GROUP_EVENT_NAMES.forEach((name) => socket.off(name, handleGroupEvent));
    };
  }, [socket, isConnected, refreshGroupsList, selectedChat, groupChats, setSelectedChat]);
}
