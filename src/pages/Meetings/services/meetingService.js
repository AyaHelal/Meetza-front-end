/**
 * Meeting API service – static functions for meeting-related HTTP calls.
 * No class instances. Pass axios instance (api) as first argument.
 */

/**
 * Fetch meeting details by ID.
 * @param {import("axios").AxiosInstance} api - axios instance
 * @param {string} meetingId
 * @returns {Promise<{ administrator_id, recording, title, description, group_id, admins } | null>}
 */
export async function getMeetingInfo(api, meetingId) {
  if (!meetingId) return null;
  try {
    const res = await api.get(`/meeting/${meetingId}`);
    const root = res?.data;
    let meeting;
    if (root?.data) {
      meeting = Array.isArray(root.data)
        ? root.data.find((m) => String(m.id) === String(meetingId))
        : root.data;
    } else if (root?.id) {
      meeting = root;
    }
    if (!meeting) return null;
    return {
      administrator_id: meeting.administrator_id,
      recording: meeting.recording,
      title: meeting.title,
      description: meeting.description,
      group_id: meeting.group_id,
      admins: Array.isArray(meeting.admins) ? meeting.admins : [],
    };
  } catch (err) {
    return null;
  }
}

/**
 * Leave meeting (HTTP call). Does not close socket or WebRTC; caller must do that.
 * @param {import("axios").AxiosInstance} api
 * @param {string} meetingId
 * @returns {Promise<void>}
 */
export async function leaveMeeting(api, meetingId) {
  if (!meetingId) return;
  await api.post(`/meeting/${meetingId}/leave`);
}
