/**
 * Group Chat API service – HTTP calls for groups, messages, and group info.
 * Pass axios instance as first argument.
 */

/**
 * Fetch user's group chats list.
 * @param {import("axios").AxiosInstance} api
 * @returns {Promise<Array>} raw groups from API
 */
export async function getGroups(api) {
  const response = await api.get("/chat/groups");
  if (!response.data?.success) return [];
  return response.data.data || [];
}

/**
 * Fetch group content name by content id.
 * @param {import("axios").AxiosInstance} api
 * @param {string} contentId
 * @returns {Promise<string>}
 */
export async function getGroupContentName(api, contentId) {
  if (!contentId) return "No content";
  try {
    const res = await api.get(`/group-contents/${contentId}`);
    const data = res?.data?.data;
    if (!data) return "No content";
    return (
      data.name ||
      data.title ||
      data.content_name ||
      data.group_name ||
      data.group_title ||
      data.title_en ||
      data.name_en ||
      data.description ||
      "No content"
    );
  } catch {
    return "No content";
  }
}

/**
 * Fetch groups with content names resolved.
 * @param {import("axios").AxiosInstance} api
 * @returns {Promise<Array<{ id, group_name, last_message, last_message_at, group_photo, group_content_id, contentName, ... }>>}
 */
export async function getGroupsWithContent(api) {
  const groups = await getGroups(api);
  const withContent = await Promise.all(
    groups.map(async (group) => {
      const contentName = await getGroupContentName(api, group.group_content_id);
      return { ...group, contentName };
    })
  );
  return withContent;
}

/**
 * Fetch group info (members, group details, content).
 * @param {import("axios").AxiosInstance} api
 * @param {string} groupId
 * @returns {Promise<object|null>}
 */
export async function getGroupInfo(api, groupId) {
  if (!groupId) return null;
  try {
    const res = await api.get(`/chat/groups/${groupId}/info`);
    if (res.data?.success && res.data.data) return res.data.data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch messages for a group.
 * @param {import("axios").AxiosInstance} api
 * @param {string} groupId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>} raw messages
 */
export async function getMessages(api, groupId, limit = 50, offset = 0) {
  if (!groupId) return [];
  try {
    const res = await api.get(
      `/chat/groups/${groupId}/messages?limit=${limit}&offset=${offset}`
    );
    if (!res.data?.success) return [];
    return res.data.data || [];
  } catch {
    return [];
  }
}

/**
 * Mark all messages in a group as read (REST).
 * @param {import("axios").AxiosInstance} api
 * @param {string} groupId
 */
export async function markAllMessagesRead(api, groupId) {
  if (!groupId) return;
  await api.put(`/chat/groups/${groupId}/messages/read-all`);
}

/**
 * Send message via REST (supports text + file).
 * @param {import("axios").AxiosInstance} api
 * @param {string} groupId
 * @param {FormData} formData
 * @returns {Promise<object|null>} sent message data or null
 */
export async function sendMessageRest(api, groupId, formData) {
  const res = await api.post(`/chat/groups/${groupId}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (res?.data?.success && res.data.data) return res.data.data;
  return null;
}
