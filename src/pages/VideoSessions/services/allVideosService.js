import api from "../../../API/axiosInstance";

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

/** Format seconds as HH:MM:SS or MM:SS for display */
function formatDurationForDisplay(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() !== "" && !value.match(/^\d+$/)) return value;
  const sec = typeof value === "number" ? Math.floor(value) : parseInt(String(value).trim(), 10);
  if (isNaN(sec) || sec < 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Map /video response into a card-friendly shape.
 */
export function mapVideoToSession(raw) {
  const durationRaw = raw.duration ?? raw.duration_seconds ?? null;
  const duration = formatDurationForDisplay(durationRaw) ?? durationRaw;
  return {
    ...raw,
    id: raw.id,
    title: raw.title ?? "Video Title",
    description: raw.description ?? "",
    thumbnailUrl: raw.poster_url ?? raw.thumbnail_url ?? raw.thumbnail ?? raw.cover_url ?? null,
    videoUrl: raw.video_url ?? raw.videoUrl ?? raw.url ?? null,
    duration,
    instructor: raw.admin?.name ?? raw.instructor ?? raw.instructor_name ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
  };
}

