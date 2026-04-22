import { useState, useCallback, useContext } from "react";
import { getGroupsWithContent } from "../services/groupChatService";
import { formatGroupForChatItem } from "../utils/groupChatFormatters";
import { AuthContext } from "../../../context/AuthContext";

/**
 * Groups list state and refresh. Uses readGroupsRef to preserve unread=0 for groups read in this session.
 */
export function useGroupChatGroups(api, readGroupsRef) {
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  const refreshGroupsList = useCallback(
    async (isInitial, selectedChat = null, currentGroupChats = [], setSelectedChat = null) => {
      if (!api) return;

      const cacheKey = `group_chats_list_cache_${user?.id || 'guest'}`;
      let hasCache = false;

      if (isInitial) {
        const cachedGroups = localStorage.getItem(cacheKey);
        if (cachedGroups) {
          try {
            const parsed = JSON.parse(cachedGroups);
            setGroupChats(parsed);
            setLoading(false);
            hasCache = true;
          } catch (e) {
            console.error("Failed to parse group chats cache", e);
          }
        }
        if (!hasCache) {
          setLoading(true);
        }
      }

      try {
        const groupsWithContent = await getGroupsWithContent(api);
        const formattedGroups = groupsWithContent.map((g) =>
          formatGroupForChatItem(g, g.unread ?? g.unread_count ?? 0)
        );

        const currentSelectedId =
          selectedChat !== null && currentGroupChats[selectedChat]
            ? currentGroupChats[selectedChat].id
            : null;

        setGroupChats((prev) => {
          let updatedGroups;
          if (isInitial) {
            updatedGroups = formattedGroups;
          } else {
            updatedGroups = formattedGroups.map((newGroup) => {
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
          }
          localStorage.setItem(cacheKey, JSON.stringify(updatedGroups));
          return updatedGroups;
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
        if (isInitial && !hasCache) {
          setLoading(false);
        }
      }
    },
    [api, readGroupsRef, user?.id]
  );

  return {
    groupChats,
    setGroupChats,
    loading,
    setLoading,
    refreshGroupsList,
  };
}
