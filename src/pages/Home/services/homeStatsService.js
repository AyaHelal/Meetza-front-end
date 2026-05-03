import {
  VideoCamera,
  Headphones,
  UsersFourIcon,
  UsersThreeIcon,
  BookmarkSimple,
} from "@phosphor-icons/react";
import api from "../../../API/axiosInstance";

/**
 * Order + UI metadata; counts come from GET /home/stats (keys must match API).
 */
export const STAT_CARD_DEFS = [
  {
    key: "video_sessions",
    icon: VideoCamera,
    title: "Video sessions",
    unit: "Videos",
    to: "/video",
  },
  {
    key: "meetings",
    icon: Headphones,
    title: "Meetings",
    unit: "meetings",
    /** Overridden per role in UI (admin → admin-meetings, member → calendar). */
    to: "/calendar",
  },
  {
    key: "groups",
    icon: UsersFourIcon,
    title: "Groups",
    unit: "groups",
    to: "/groups",
  },
  {
    key: "group_chat_unread",
    icon: UsersThreeIcon,
    title: "Group chat",
    unit: "Unread",
    to: "/messages",
  },
  {
    key: "saved_videos",
    icon: BookmarkSimple,
    title: "Saved",
    unit: "Saved",
    to: "/saved-videos",
  },
];

/**
 * Admin / Super_Admin: arrow opens Admin Meetings; members: Calendar.
 */
export function getMeetingsStatLinkForRole(userRole) {
  const r = (userRole ?? "").toString().trim().toLowerCase();
  const isSuper =
    r === "super_admin" || r.includes("super_admin") || r.includes("super-admin");
  const isAdministrator = r === "administrator" || r === "admin";
  if (isSuper || isAdministrator) return "/admin-meetings";
  return "/calendar";
}

export function buildHomeStatItems(apiData = {}) {
  return STAT_CARD_DEFS.map((def) => ({
    key: def.key,
    icon: def.icon,
    title: def.title,
    unit: def.unit,
    to: def.to,
    value: String(Number(apiData[def.key]) || 0),
  }));
}

/** Fallback when API is unavailable (same shape as buildHomeStatItems({})). */
export const DEFAULT_HOME_STAT_ITEMS = buildHomeStatItems({});

/**
 * GET /home/stats — { video_sessions, meetings, groups, group_chat_unread, saved_videos }
 */
export async function getHomeStats() {
  let res;
  try {
    res = await api.get("/home/stats");
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.get("/home/stats/");
  }
  const root = res?.data?.data ?? res?.data;
  if (root && typeof root === "object" && !Array.isArray(root)) return root;
  return {};
}
