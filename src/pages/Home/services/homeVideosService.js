import api from "../../../API/axiosInstance";
import { pickArrayPayload } from "./homeServiceUtils";

/** Placeholder "Videos" row until wired to videos API */
export const DEFAULT_HOME_VIDEOS = [
  {
    id: "v1",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl: null,
  },
  {
    id: "v2",
    title: "How to live",
    status: "watching",
    progress: 38,
    thumbnailUrl: null,
  },
  {
    id: "v3",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl: null,
  },
  {
    id: "v4",
    title: "How to live",
    status: "watching",
    progress: 62,
    thumbnailUrl: null,
  },
];

/**
 * GET /home/most-interested-videos — returns dashboard videos.
 * Response shape: { success: true, data: [ ... ] }
 */
export async function getMostInterestedVideos() {
  let res;
  try {
    res = await api.get("/home/most-interested-videos");
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.get("/home/most-interested-videos/");
  }
  const list = pickArrayPayload(res?.data?.data ?? res?.data);
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

