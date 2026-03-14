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

/**
 * Map /video response into a card-friendly shape.
 */
export function mapVideoToSession(raw) {
  return {
    id: raw.id,
    title: raw.title ?? "Video Title",
    description: raw.description ?? "",
    thumbnailUrl: raw.poster_url ?? raw.thumbnail_url ?? raw.thumbnail ?? raw.cover_url ?? null,
    videoUrl: raw.video_url ?? raw.videoUrl ?? raw.url ?? null,
    duration: raw.duration ?? raw.duration_seconds ?? null,
    instructor: raw.admin?.name ?? raw.instructor ?? raw.instructor_name ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    ...raw,
  };
}

