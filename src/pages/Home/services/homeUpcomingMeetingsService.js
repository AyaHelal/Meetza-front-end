import api from "../../../API/axiosInstance";
import { pickArrayPayload } from "./homeServiceUtils";

/** Placeholder row shape for Storybook / offline (group on top, title, start/end strings). */
export const DEFAULT_UPCOMING_MEETINGS = [
  {
    id: "1",
    groupLabel: "Group name",
    course: "OOP 1st semester",
    start: "Nov 28 2026, 3:30 pm",
    end: "Nov 28 2026, 7:30 pm",
  },
];

export function formatUpcomingMeetingDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Map API row → HomeMeetingCard props (`course` holds meeting title). */
export function mapUpcomingMeetingRow(row) {
  const id = row?.id ?? row?.meeting_id ?? "";
  return {
    id: String(id),
    groupLabel: row?.group_name ?? row?.groupName ?? "—",
    course: row?.title ?? "—",
    start: formatUpcomingMeetingDateTime(row?.start_time),
    end: formatUpcomingMeetingDateTime(row?.end_time),
  };
}

/**
 * GET /home/upcoming-meetings?limit=
 * @returns {Promise<Array>} raw API rows
 */
export async function getHomeUpcomingMeetings({ limit = 10, search = "" } = {}) {
  const params = {};
  if (limit != null) params.limit = limit;
  if (search) params.search = search;
  let res;
  try {
    res = await api.get("/home/upcoming-meetings", { params });
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.get("/home/upcoming-meetings/", { params });
  }
  const list = pickArrayPayload(res?.data?.data ?? res?.data);
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}
