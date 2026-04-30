/**
 * MainChat API service – meeting-related HTTP calls used by MainChat component.
 * Pass axios instance (api) as first argument where needed.
 */

/**
 * Fetch meetings for a group.
 * @param {import("axios").AxiosInstance} api
 * @param {string} groupId
 * @returns {Promise<Array<{ id, meeting_id, meetingId, start_time, end_time, status, ... }>>}
 */
export async function getMeetingsByGroupId(api, groupId) {
  if (!groupId) return [];
  try {
    const res = await api.get("/meeting", { params: { group_id: groupId } });
    return extractMeetingsList(res?.data);
  } catch {
    return [];
  }
}

/**
 * Fetch a single meeting by ID.
 * @param {import("axios").AxiosInstance} api
 * @param {string} meetingId
 * @returns {Promise<object|null>}
 */
export async function getMeetingById(api, meetingId) {
  if (!meetingId) return null;
  try {
    const res = await api.get(`/meeting/${meetingId}`);
    return extractMeetingFromResponse(res?.data);
  } catch {
    return null;
  }
}

/**
 * Join a meeting (POST).
 * @param {import("axios").AxiosInstance} api
 * @param {string} meetingId
 */
export async function joinMeeting(api, meetingId) {
  if (!meetingId) return;
  await api.post(`/meeting/${meetingId}/join`);
}

/**
 * Normalize API response to a single meeting object.
 * @param {object} meetingData - response.data from GET /meeting/:id
 * @returns {object|null}
 */
export function extractMeetingFromResponse(meetingData) {
  if (!meetingData) return null;
  if (Array.isArray(meetingData?.data)) {
    return meetingData.data[0] ?? null;
  }
  if (meetingData?.data?.id) return meetingData.data;
  if (meetingData?.id) return meetingData;
  return null;
}

/**
 * Normalize API response to array of meetings.
 * @param {object} root - response.data from GET /meeting?group_id=...
 * @returns {Array}
 */
export function extractMeetingsList(root) {
  if (!root) return [];
  const nested = root?.data && root?.success === undefined ? root?.data : null;
  const effective = nested || root;
  const payload = effective?.data ?? effective;
  if (Array.isArray(payload)) return payload;
  return payload ? [payload] : [];
}

/**
 * Update the content name for a group content record.
 * @param {import("axios").AxiosInstance} api
 * @param {string} groupId
 * @param {string} contentId
 * @param {string} newName
 */
export async function updateContentName(api, groupId, contentId, newName) {
  if (!contentId || !newName) return;

  try {
    // Try updating via group-contents first
    await api.put(`/group-contents/${contentId}`, {
      name: newName,
      content_name: newName,
      group_content_name: newName
    });
  } catch {
    // Fallback to group update if the first one fails
    if (groupId) {
      const form = new FormData();
      form.append('group_content_name', newName);
      await api.put(`/group/${groupId}`, form);
    }
  }
}
