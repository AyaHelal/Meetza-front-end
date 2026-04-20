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
 * Search group messages by word.
 * Backend route: `GET /chat/groups/:id/messages?searchMessage=:word`
 *
 * @param {import("axios").AxiosInstance} api
 * @param {string|number} groupId
 * @param {string} word
 * @returns {Promise<Array<string|number>>} message ids (best-effort parse)
 */
export async function searchMessageIds(api, groupId, word) {
  if (!groupId || !String(word || "").trim()) return [];
  const q = encodeURIComponent(String(word).trim());
  const res = await api.get(`/chat/groups/${groupId}/messages?searchMessage=${q}`);
  const payload = res?.data?.data ?? res?.data ?? null;

  if (Array.isArray(payload)) {
    // array of messages or ids
    return payload
      .map((x) => (x && typeof x === "object" ? x.id ?? x.message_id ?? x.messageId : x))
      .filter((id) => id != null && String(id).trim() !== "");
  }

  if (payload && typeof payload === "object") {
    const list =
      payload.data ??
      payload.messages ??
      payload.results ??
      payload.items ??
      payload.matches ??
      [];
    if (Array.isArray(list)) {
      return list
        .map((x) => (x && typeof x === "object" ? x.id ?? x.message_id ?? x.messageId : x))
        .filter((id) => id != null && String(id).trim() !== "");
    }
  }

  return [];
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
 * Build multipart body for `POST /chat/groups/:groupId/messages`.
 * When replying, include `parentMessageId` (same field name the server reads from `req.body`).
 *
 * @param {object} opts
 * @param {string} [opts.messageText]
 * @param {File|null} [opts.file]
 * @param {string|null} [opts.mediaCategory]
 * @param {string|null} [opts.normalizedType] from deriveMediaCategory (hook)
 * @param {string|number|null} [opts.parentMessageId] parent message id for replies
 * @returns {FormData}
 */
export function buildSendMessageFormData({
  messageText = "",
  file = null,
  mediaCategory = null,
  normalizedType = null,
  parentMessageId = null,
}) {
  const formData = new FormData();
  const trimmed = (messageText || "").trim();
  if (trimmed) formData.append("message", trimmed);

  if (parentMessageId != null && String(parentMessageId).trim() !== "") {
    formData.append("parentMessageId", String(parentMessageId));
  }

  if (!file) return formData;

  formData.append("media", file);
  const ft =
    mediaCategory === "voice_note"
      ? "voice_note"
      : mediaCategory === "audio" ||
          (file.type?.startsWith("audio/") && mediaCategory !== "voice_note")
        ? "audio"
        : file.type?.startsWith("video/") && mediaCategory === "voice_note"
          ? "voice_note"
          : normalizedType || "document";
  if (ft) formData.append("media_type", ft);
  if (file.type) formData.append("file_mime", file.type);
  if (file.name) formData.append("file_name", file.name);
  return formData;
}

/**
 * Send message via REST (supports text + file + optional reply `parentMessageId` in body).
 * Prefer {@link buildSendMessageFormData} so reply id is always set consistently.
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

/**
 * React to a group message (REST).
 * POST `/chat/groups/:groupId/messages/:messageId/react`
 *
 * @param {import("axios").AxiosInstance} api
 * @param {string} groupId
 * @param {string} messageId
 * @param {Record<string, unknown>} [body] — e.g. `{ emoji: "👍" }`; match your backend contract
 * @returns {Promise<object|null>} Parsed `response.data` from axios (often `{ success, data }`)
 */
export async function reactToMessage(api, groupId, messageId, body = {}) {
  if (!groupId || !messageId) return null;
  const res = await api.post(
    `/chat/groups/${groupId}/messages/${messageId}/react`,
    body
  );
  return res?.data ?? null;
}
