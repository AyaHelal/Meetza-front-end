import api from "../../../API/axiosInstance";

/**
 * Fetch video sessions (e.g. from GET /video-sessions or group-specific).
 * Adapt path and response parsing to your backend.
 */
export async function getVideoSessions(groupId = null) {
  const params = groupId ? { group_id: groupId } : {};
  const res = await api.get("/video-session", { params });
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

/**
 * Parse API response into a consistent session shape.
 */
export function parseSession(raw) {
  return {
    id: raw.id ?? raw.session_id ?? raw.video_session_id,
    title: raw.title ?? raw.name ?? "Video Title",
    description: raw.description ?? raw.summary ?? "Video Description",
    thumbnailUrl: raw.thumbnail_url ?? raw.thumbnail ?? raw.cover_url ?? null,
    videoUrl: raw.video_url ?? raw.videoUrl ?? raw.url ?? null,
    duration: raw.duration ?? raw.duration_seconds ?? "24:22",
    instructor: raw.instructor ?? raw.instructor_name ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    ...raw,
  };
}
