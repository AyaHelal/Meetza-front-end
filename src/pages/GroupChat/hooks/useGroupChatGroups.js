import { useState, useCallback } from "react";
import { getGroupsWithContent } from "../services/groupChatService";
import { formatGroupForChatItem } from "../utils/groupChatFormatters";

/**
 * Groups list state and refresh. Uses readGroupsRef to preserve unread=0 for groups read in this session.
 */
export function useGroupChatGroups(api, readGroupsRef) {
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshGroupsList = useCallback(
    async (isInitial, selectedChat = null, currentGroupChats = [], setSelectedChat = null) => {
      if (!api) return;
      try {
        if (isInitial) setLoading(true);
        const groupsWithContent = await getGroupsWithContent(api);
        const formattedGroups = groupsWithContent.map((g) =>
          formatGroupForChatItem(g, g.unread ?? g.unread_count ?? 0)
        );

        const currentSelectedId =
          selectedChat !== null && currentGroupChats[selectedChat]
            ? currentGroupChats[selectedChat].id
            : null;

        setGroupChats((prev) => {
          if (isInitial) return formattedGroups;
          return formattedGroups.map((newGroup) => {
            const groupIdStr = String(newGroup.id);
            const apiUnreadCount = newGroup.unread;
            if (readGroupsRef?.current?.has(groupIdStr)) {
              if (apiUnreadCount > 0) {
                readGroupsRef.current.delete(groupIdStr);
                return { ...newGroup, unread: apiUnreadCount };
              }
              return { ...newGroup, unread: 0 };
            }
            const oldGroup = prev.find((g) => String(g.id) === groupIdStr);
            if (oldGroup) {
              const preservedUnread =
                oldGroup.unread === 0 ? 0 : newGroup.unread || oldGroup.unread || 0;
              return { ...newGroup, unread: preservedUnread };
            }
            return newGroup;
          });
        });

        if (setSelectedChat && currentSelectedId) {
          const newIndex = formattedGroups.findIndex(
            (g) => String(g.id) === String(currentSelectedId)
          );
          setSelectedChat(newIndex !== -1 ? newIndex : null);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [api, readGroupsRef]
  );

  return {
    groupChats,
    setGroupChats,
    loading,
    setLoading,
    refreshGroupsList,
  };
}
