import api from "../../../API/axiosInstance";
import { parseSession } from "./videoSessionsService";

/**
 * Fetch all videos for the standalone /video page.
 * Uses backend GET /video (no filters).
 */
export async function getAllVideos() {
  const res = await api.get("/video");
  const root = res?.data;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  return [];
}

/**
 * Map /video response into the same card shape as group-filtered sessions
 * (includes watch progress fields for the card progress bar).
 */
export function mapVideoToSession(raw) {
  return parseSession(raw ?? {});
}

