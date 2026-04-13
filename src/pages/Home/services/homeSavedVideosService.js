import api from "../../../API/axiosInstance";
import { pickArrayPayload } from "./homeServiceUtils";

/** Placeholder "Saved Videos" row until wired to saved videos API */
export const DEFAULT_HOME_SAVED_VIDEOS = [
  {
    id: "sv1",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "sv2",
    title: "How to live",
    status: "watching",
    progress: 38,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "sv3",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "sv4",
    title: "How to live",
    status: "watching",
    progress: 62,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
];

/**
 * GET /home/saved-videos?limit=10 — returns saved videos for dashboard.
 * Response shape is usually { success: true, data: [ ... ] }.
 */
export async function getHomeSavedVideos({ limit = 10 } = {}) {
  const params = { limit };
  let res;
  try {
    res = await api.get("/home/saved-videos", { params });
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.get("/home/saved-videos/", { params });
  }
  const list = pickArrayPayload(res?.data?.data ?? res?.data);
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

