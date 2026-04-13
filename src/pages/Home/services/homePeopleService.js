import api from "../../../API/axiosInstance";
import { pickArrayPayload } from "./homeServiceUtils";

/** Placeholder "People" row until wired to instructors/people API */
export const DEFAULT_HOME_PEOPLE = [
  {
    id: "p1",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=12",
  },
  {
    id: "p2",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=32",
  },
  {
    id: "p3",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=45",
  },
  {
    id: "p4",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=56",
  },
];

/**
 * GET /home/leaders — returns leaders/people for dashboard.
 * Response shape usually { success: true, data: [ ... ] }.
 */
export async function getHomeLeaders() {
  let res;
  try {
    res = await api.get("/home/leaders");
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.get("/home/leaders/");
  }
  const list = pickArrayPayload(res?.data?.data ?? res?.data);
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

