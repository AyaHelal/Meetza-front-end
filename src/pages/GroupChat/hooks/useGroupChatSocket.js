import { useEffect, useReducer } from "react";
import { formatMessage, getMediaLabel } from "../utils/groupChatFormatters";
import { playChatIncomingSound } from "../../../utils/uiSounds";

function isMessageFromUser(messageData, user) {
  if (!user || !messageData) return false;
  const email = (messageData.sender_email || "").toLowerCase();
  const userEmail = (user.email || "").toLowerCase();
  if (email && userEmail && email === userEmail) return true;
  const sid = messageData.sender_id;
  const uid = user.id;
  if (sid == null || uid == null) return false;
  return String(sid) === String(uid);
}

function previewFromSocketMessage(messageData) {
  const text = messageData.message || messageData.text;
  if (text) return text;
  const m = messageData.media?.[0];
  if (!m) return "No messages yet";
  return getMediaLabel(
    m.media_type || m.mediaType,
    m.file_name || m.fileName
  );
}

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
  const [rejoinGeneration, bumpRejoin] = useReducer((n) => n + 1, 0);

  // After reconnect, server drops socket from all rooms — clear join cache and bump deps so we joinGroup again.
  useEffect(() => {
    if (!socket || !joinedGroupsRef) return;
    const onReconnect = () => {
      joinedGroupsRef.current?.clear?.();
      bumpRejoin();
    };
    socket.on("connect", onReconnect);
    return () => socket.off("connect", onReconnect);
  }, [socket, joinedGroupsRef]);

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
  }, [socket, isConnected, groupChats, joinGroup, leaveGroup, joinedGroupsRef, rejoinGeneration]);

  // Message listener
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (messageData) => {
      try {
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
                const isFromCurrentUser = isMessageFromUser(messageData, currentUser);
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
          const isFromCurrentUser = isMessageFromUser(messageData, currentUser);
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
              const isFromCurrentUser = isMessageFromUser(messageData, currentUser);
              let newUnread = group.unread || 0;
              if (isCurrentGroup) newUnread = 0;
              else if (!isFromCurrentUser) newUnread = (group.unread || 0) + 1;
              const subject = previewFromSocketMessage(messageData);
              return { ...group, subject, unread: newUnread };
            })
          );
        }

        const soundUser = userRef?.current;
        if (!isMessageFromUser(messageData, soundUser)) {
          const viewingThisThread =
            Boolean(currentGroupIdRef?.current) &&
            String(currentGroupIdRef.current) === messageGroupId;
          playChatIncomingSound(viewingThisThread);
        }
      } catch (e) {
        console.error("handleNewMessage:", e);
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
