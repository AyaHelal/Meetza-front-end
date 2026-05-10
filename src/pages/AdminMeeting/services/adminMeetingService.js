/** API services for Admin Meeting page. */
import api from "../../../API/axiosInstance";
import { dedupeById } from "../../../utils/dedupeById";
import { groupIsManagedByUser } from "../../Groups/services/groupsService";
import {
  formatForAPI,
  getStoredRecordFlags,
  setStoredRecordFlag,
  userIsMeetingAdmin,
} from "../utilis/adminMeetingRules";



export const fetchGroups = async (user) => {

  const res = await api.get("/group");
  const payload = Array.isArray(res.data) ? res.data : res.data?.data || [];
  const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");
  const roleNorm = String(currentUser?.role || "").trim();
  const isSuperAdmin = roleNorm === "Super_Admin";
  const isAdministrator = roleNorm === "Administrator" || roleNorm.toLowerCase() === "administrator";
  let list = dedupeById(payload);
  if (isAdministrator && !isSuperAdmin && currentUser?.id != null) {
    list = list.filter((g) => groupIsManagedByUser(g, currentUser.id));
  }
  return list.map((g) => ({ id: g.id, name: g.name || g.group_name }));
};

export const fetchMeetings = async (user, options = {}) => {
  const url = options.query ? `/meeting?title=${encodeURIComponent(options.query)}` : "/meeting";
  const response = await api.get(url);
  const data = response?.data;
  let meetingsList = [];
  if (data?.success && Array.isArray(data?.data)) {
    meetingsList = data.data;
  } else if (Array.isArray(data?.data)) {
    meetingsList = data.data;
  } else if (Array.isArray(data)) {
    meetingsList = data;
  }
  const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");
  const roleNorm = String(currentUser?.role || "").trim();
  const isSuperAdmin = roleNorm === "Super_Admin";
  const isAdministrator = roleNorm === "Administrator" || roleNorm.toLowerCase() === "administrator";
  if ((isAdministrator || isSuperAdmin) && currentUser?.id != null && String(currentUser.id) !== "") {
    if (!isSuperAdmin) {
      meetingsList = meetingsList.filter((m) => userIsMeetingAdmin(m, currentUser.id));
    }
  }
  const patch = options.patchRecordMeeting;
  if (patch?.id != null) {
    meetingsList = meetingsList.map((m) =>
      (m.id === patch.id || m.meeting_id === patch.id) ? { ...m, record_meeting: patch.value } : m
    );
  }
  const storedFlags = getStoredRecordFlags();
  return meetingsList.map((m) => {
    const id = m.id || m.meeting_id;
    const stored = id != null ? storedFlags[id] : undefined;
    const recordMeeting = m.record_meeting !== undefined && m.record_meeting !== null ? m.record_meeting : stored;
    return { ...m, record_meeting: recordMeeting };
  });
};

export const createMeeting = async (formData) => {
  const form = new FormData();
  form.append("title", formData.title);
  form.append("start_time", formatForAPI(formData.startTime));
  form.append("end_time", formatForAPI(formData.endTime));
  form.append("group_id", formData.group_id);
  // form.append("status", formData.status); // User requested not to send status on create
  form.append("recording", formData.recordMeeting === "Recording" ? "1" : "0");
  form.append("weekly", formData.weeklyOption === "Active" ? "1" : formData.weeklyOption === "Inactive" ? "0" : "");
  if (formData.description) form.append("description", formData.description);
  form.append("poster_file", formData.poster_file);
  if (Array.isArray(formData.files)) {
    formData.files.forEach((file) => {
      if (file instanceof File) form.append("files", file);
    });
  }
  const res = await api.post("/meeting", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const createdMeeting = res.data?.data;
  const recordValue = formData.recordMeeting === "Recording" ? 1 : 0;
  if (createdMeeting?.id) setStoredRecordFlag(createdMeeting.id, recordValue);
  return { createdMeeting, recordValue };
};

export const joinMeeting = async (meetingId) => {
  return await api.post(`/meeting/${meetingId}/join`);
};

export const updateRecurrence = async (meetingId, newStatus) => {
  if (newStatus === "active") {
    return await api.post(`/meeting/${meetingId}/activate-recurrence`);
  } else {
    return await api.patch(`/meeting/${meetingId}/deactivate-recurrence`);
  }
};

export const deleteMeeting = async (meetingId, deleteAllWeeks = false) => {
  if (deleteAllWeeks) {
    return await api.delete(`/meeting/${meetingId}`, { params: { scope: "series" } });
  } else {
    return await api.delete(`/meeting/${meetingId}`);
  }
};

export const updateMeeting = async (editingMeetingId, formData, originalMeeting) => {
  const hasPoster = formData.poster_file instanceof File;
  const hasDescription = formData.description != null;
  if (hasPoster || hasDescription) {
    const form = new FormData();
    form.append("title", formData.title);
    form.append("start_time", formatForAPI(formData.startTime));
    form.append("end_time", formatForAPI(formData.endTime));
    form.append("status", formData.status);
    form.append("group_id", formData.group_id || originalMeeting.group_id);
    form.append("recording", formData.recordMeeting === "Recording" ? "1" : "0");
    form.append("weekly", formData.weeklyOption === "Active" ? "1" : formData.weeklyOption === "Inactive" ? "0" : "");
    if (formData.description != null) form.append("description", formData.description);
    if (hasPoster) form.append("poster_file", formData.poster_file);
    return await api.put(`/meeting/${editingMeetingId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else {
    const payload = {
      title: formData.title,
      start_time: formatForAPI(formData.startTime),
      end_time: formatForAPI(formData.endTime),
      status: formData.status,
      group_id: formData.group_id || originalMeeting.group_id,
      recording: formData.recordMeeting === "Recording" ? "1" : "0",
      weekly: formData.weeklyOption === "Active" ? "1" : formData.weeklyOption === "Inactive" ? "0" : "",
    };
    return await api.put(`/meeting/${editingMeetingId}`, payload);
  }
};

