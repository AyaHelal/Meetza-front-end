/** Pure helpers + localStorage record flags for Admin Meeting page. */

export const getCurrentDateTimeLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const getCurrentEndDateTimeLocal = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Format datetime for API (same as meetza-admin): "YYYY-MM-DD HH:mm:00"
export const formatForAPI = (inputValue) => {
  if (!inputValue) return "";
  const d = new Date(inputValue);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

// لتعبئة datetime-local من الـ API (Edit)
export const formatForInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const isRecording = (value) => value === true || value === 1 || value === "1";

/**
 * GET /meeting may attach `admins[]` with `group_admin_id` / `user_id` instead of top-level `administrator_id`.
 */
export const userIsMeetingAdmin = (meeting, userId) => {
  if (meeting == null || userId == null || userId === "") return false;
  const uid = String(userId);
  if (meeting.administrator_id != null && String(meeting.administrator_id) === uid) return true;
  const admins = meeting.admins;
  if (!Array.isArray(admins)) return false;
  return admins.some((a) => {
    const aid = a?.user_id ?? a?.group_admin_id ?? a?.id;
    return aid != null && String(aid) === uid;
  });
};

export const STORAGE_KEY_RECORD_FLAGS = "meetza_admin_meeting_record_flags";

export const getStoredRecordFlags = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORD_FLAGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setStoredRecordFlag = (meetingId, value) => {
  const flags = getStoredRecordFlags();
  flags[meetingId] = value;
  localStorage.setItem(STORAGE_KEY_RECORD_FLAGS, JSON.stringify(flags));
};

export const emptyFormState = () => ({
  title: "",
  startTime: getCurrentDateTimeLocal(),
  endTime: getCurrentEndDateTimeLocal(),
  status: "Scheduled",
  group_id: "",
  description: "",
  recordMeeting: "Recording",
  weeklyOption: "Active",
  poster_file: null,
  files: [],
});

export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const day = days[date.getDay()];
  const dayNum = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day} ${dayNum}/${month}/${year}`;
};

export const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${period}`;
};

export const getTimeRange = (startTime, endTime) => {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  return `${start} to ${end}`;
};
