import api from "../../../API/axiosInstance";

const CALENDAR_MEETINGS_PATH =
  (process.env.REACT_APP_CALENDAR_MEETINGS_ENDPOINT || "meeting").replace(/^\//, "");

export const getGroups = async (isAdminRole) => {
  const endpoint = isAdminRole ? "/group" : "/chat/groups";
  const response = await api.get(endpoint);
  const raw = response?.data?.data ?? response?.data;
  const payload = Array.isArray(raw) ? raw : [];
  
  const map = {};
  const list = [];
  payload.forEach((g) => {
    const id = g.id ?? g.group_id ?? g._id;
    const name = g.name ?? g.group_name ?? g.title ?? g.content_name ?? g.group_content_name ?? "";
    if (id != null && id !== "") {
      const idStr = String(id);
      if (map[idStr] !== undefined) return;
      const nameStr = name && String(name).trim() ? String(name).trim() : "—";
      map[idStr] = nameStr;
      list.push({ id: idStr, name: nameStr });
    }
  });
  return { map, list };
};

export const deleteMeeting = async (meetingId) => {
  return await api.delete(`/meeting/${meetingId}`);
};

export const joinMeeting = async (meetingId) => {
  return await api.post(`/meeting/${meetingId}/join`);
};

export const getMeetings = async (params) => {
  try {
    const res = await api.get(`/${CALENDAR_MEETINGS_PATH}`, { params });
    const root = res?.data;
    return Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
  } catch (err) {
    if (err?.response?.status === 404 && Object.keys(params).length > 0) {
      // Fallback to /meeting
      const fallback = await api.get(`/meeting`, { params });
      const root = fallback?.data;
      return Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
    }
    throw err;
  }
};
