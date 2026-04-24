import { getLastMessagePreview } from "../utils/groupChatFormatters";

const CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Fetch unread count for a group via REST API.
 */
export async function fetchUnreadCount(axiosInstance, groupId) {
  try {
    const res = await axiosInstance.get(`/chat/groups/${groupId}/unread-count`, {
      params: { _cacheBust: Date.now() },
      headers: CACHE_HEADERS,
    });
    if (res?.status === 304) {
      const res2 = await axiosInstance.get(`/chat/groups/${groupId}/unread-count`, {
        params: { _cacheBust: Date.now() },
        headers: CACHE_HEADERS,
      });
      if (res2?.status === 200) {
        Object.defineProperty(res, "data", { value: res2.data, configurable: true });
        Object.defineProperty(res, "status", { value: res2.status, configurable: true });
      }
    }
    const payload = res?.data;
    if (!payload) return { id: groupId, count: 0 };
    if (typeof payload.data === "number") return { id: groupId, count: payload.data };
    if (payload.data?.count != null) return { id: groupId, count: payload.data.count };
    if (payload.data?.unread != null) return { id: groupId, count: payload.data.unread };
    if (payload.data?.unread_count != null) return { id: groupId, count: payload.data.unread_count };
    if (payload.data?.unreadCount != null) return { id: groupId, count: payload.data.unreadCount };
    if (typeof payload.count === "number") return { id: groupId, count: payload.count };
    return { id: groupId, count: Number(payload.data) || 0 };
  } catch (e) {
    if (e?.response?.status === 404) return { id: groupId, count: 0, endpointMissing: true };
    return { id: groupId, count: 0 };
  }
}

/**
 * Fetch last message for a chat and return preview string (text or media emoji).
 */
export async function fetchLastMessagePreview(axiosInstance, chat) {
  try {
    const res = await axiosInstance.get(`/chat/groups/${chat.id}/messages?limit=1`);
    if (!res?.data?.success || !res.data.data?.length) return { id: chat.id, preview: null };
    const lastMsg = res.data.data[0];
    const preview = getLastMessagePreview(lastMsg);
    return { id: chat.id, preview };
  } catch (err) {
    if (err?.response?.status === 404) {
      return { id: chat.id, preview: null, stale: true };
    }
    return { id: chat.id, preview: null };
  }
}
