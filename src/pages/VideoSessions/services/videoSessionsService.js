import api, { API_BASE_URL } from "../../../API/axiosInstance";
import axios from "axios";

/**
 * Build full URL for a file (e.g. video_url). If url is relative, prepends API base.
 */
export function buildFileUrl(url) {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = (API_BASE_URL || "").replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return base ? `${base}${path}` : path;
}

/**
 * Fetch videos for Video Sessions page.
 * Uses backend GET /video with optional ?group_id=.
 */
export async function getVideoSessions(groupId = null) {
  const normalizedGroupId = groupId?.toString?.().trim?.();
  if (!normalizedGroupId) {
    // Must query by group_id only; do not fetch all videos.
    return [];
  }

  const params = { group_id: normalizedGroupId };
  const res = await api.get("/video", { params });
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
 * Parse /video API response into a consistent session shape for UI.
 */
export function parseSession(raw) {
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

/**
 * Fetch full details for a single video by id.
 * Uses backend GET /video/:id and returns the parsed payload.
 */
export async function getVideoDetail(id) {
  if (!id) throw new Error("video id is required");
  const res = await api.get(`/video/${id}`);
  const root = res?.data;
  // Backend shape: { success, data: { video, admin, likes_count, ... } }
  return root?.data ?? root;
}

/**
 * Create a comment or reply for a video.
 * POST /comment { video_id, comment_text, parent_id? } — pass parent_id to reply to a comment.
 */
export async function createComment(videoId, commentText, parentId = null) {
  if (!videoId) throw new Error("video id is required");
  if (!commentText || !commentText.toString().trim()) throw new Error("comment_text is required");
  const body = {
    video_id: videoId,
    comment_text: commentText.toString().trim(),
  };
  if (parentId) body.parent_id = parentId;
  const res = await api.post("/comment", body);
  return res?.data;
}

/**
 * Fetch all comments for a video.
 * GET /comment/video/:id
 */
export async function getVideoComments(videoId) {
  if (!videoId) throw new Error("video id is required");
  const res = await api.get(`/comment/video/${videoId}`);
  const root = res?.data;
  const data = root?.data ?? root;
  if (!data) return { commentCount: 0, comments: [] };
  return {
    commentCount: data.commentCount ?? 0,
    comments: Array.isArray(data.comments) ? data.comments : [],
  };
}

/**
 * Edit a comment by id.
 * PUT /comment/:id
 */
export async function editComment(commentId, commentText) {
  if (!commentId) throw new Error("comment id is required");
  if (!commentText) throw new Error("comment text is required");
  const res = await api.patch(`/comment/${commentId}`, { comment_text: commentText });
  return res?.data;
}

/**
 * Delete a comment by id.
 * DELETE /comment/:id
 */
export async function deleteComment(commentId) {
  if (!commentId) throw new Error("comment id is required");
  const res = await api.delete(`/comment/${commentId}`);
  return res?.data;
}

/**
 * Create or update like/dislike for a video.
 * Tries POST /likes then POST /like { video_id, like_type } (backend path may be either).
 */
export async function createLike(videoId, likeType) {
  if (!videoId) throw new Error("video id is required");
  if (typeof likeType !== "number" || ![0, 1].includes(likeType)) {
    throw new Error("likeType must be 0 (dislike) or 1 (like)");
  }

  const payload = { video_id: videoId, like_type: likeType };
  try {
    const res = await api.post("/like", payload);
    return res?.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const res = await api.post("/like", payload);
      return res?.data;
    }
    throw err;
  }
}

/**
 * Remove like/dislike. DELETE /like/:video_id (video id in path).
 */
export async function deleteLike(videoId) {
  if (!videoId) throw new Error("video id is required");

  const res = await api.delete(`/like/${encodeURIComponent(videoId)}`);
  return res?.data;
}

/**
 * Save a video for the current user.
 * POST /saved_video { video_id }
 */
export async function saveVideo(videoId) {
  if (!videoId) throw new Error("video id is required");

  const res = await api.post("/saved_video", { video_id: videoId });
  return res?.data;
}

/**
 * Unsave (delete saved) a video for the current user.
 * DELETE /saved_video/:video_id
 */
export async function deleteSavedVideo(videoId) {
  if (!videoId) throw new Error("video id is required");

  const res = await api.delete(`/saved_video/${encodeURIComponent(videoId)}`);
  return res?.data;
}

/**
 * Fetch related videos for a video id and group id.
 * GET /video/:id/related?group_id=:id
 */
export async function getRelatedVideos(videoId, groupId) {
  if (!videoId) throw new Error("video id is required");
  if (!groupId) throw new Error("group id is required");

  const res = await api.get(`/video/${encodeURIComponent(videoId)}/related`, {
    params: { group_id: groupId },
  });

  const root = res?.data;
  const data = root?.data ?? root;
  return Array.isArray(data?.videos) ? data.videos : [];
}

/**
 * Fetch related videos for /video page (no group filter).
 * GET /video/:id/related
 */
export async function getGlobalRelatedVideos(videoId) {
  if (!videoId) throw new Error("video id is required");
  const res = await api.get(`/video/${encodeURIComponent(videoId)}/related`);
  const root = res?.data;
  const data = root?.data ?? root;
  return Array.isArray(data?.videos) ? data.videos : [];
}

/**
 * Parse "HH:MM:SS" or "MM:SS" to total seconds (for fallback when duration_seconds not provided).
 */
function parseDurationToSeconds(str) {
  if (str == null || typeof str !== "string") return 0;
  const trimmed = str.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(":").map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * Create a new video.
 * POST /video/create with multipart/form-data. Backend expects duration in seconds (same as meeting recording).
 */
export async function createVideo(payload) {
  const { title, poster_file, video_file, duration, duration_seconds, group_id, description } = payload ?? {};
  if (!title || !title.toString().trim()) throw new Error("title is required");
  if (!video_file || !(video_file instanceof File)) throw new Error("video_file is required");
  if (!group_id || !group_id.toString().trim()) throw new Error("group_id is required");

  const seconds = typeof duration_seconds === "number" && !isNaN(duration_seconds) && duration_seconds >= 0
    ? Math.floor(duration_seconds)
    : parseDurationToSeconds(duration);

  const formData = new FormData();
  formData.append("title", title.toString().trim());
  formData.append("video_file", video_file, video_file.name || "video.mp4");
  formData.append("group_id", group_id.toString().trim());
  formData.append("duration", String(seconds));
  formData.append("description", (description && description.toString().trim()) || "");

  if (poster_file && poster_file instanceof File) {
    formData.append("poster_file", poster_file, poster_file.name || "poster.png");
  }

  const res = await api.post("/video/create", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res?.data?.data ?? res?.data;
}

/**
 * Update a video. POST /video/:id with form-data (title, description, etc.).
 */
export async function updateVideo(videoId, payload) {
  if (!videoId) throw new Error("video id is required");
  const { title, description } = payload ?? {};
  const formData = new FormData();
  if (title != null && title.toString().trim() !== "") formData.append("title", title.toString().trim());
  if (description != null) formData.append("description", (description && description.toString().trim()) || "");
  const res = await api.post(`/video/${encodeURIComponent(videoId)}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
  return res?.data?.data ?? res?.data;
}

/**
 * Delete a video. DELETE /video/:id.
 */
export async function deleteVideo(videoId) {
  if (!videoId) throw new Error("video id is required");
  const res = await api.delete(`/video/${encodeURIComponent(videoId)}`);
  return res?.data?.data ?? res?.data;
}

/**
 * Generate AI summary and transcript for a video.
 * POST /summarize_video/:video_id with video URL. Backend fetches the video from the URL
 * (avoids CORS/304 when frontend would fetch from Cloudinary).
 */
export async function summarizeVideo(videoId, videoUrl, language = 'en') {
  if (!videoId) throw new Error("video ID is required");
  if (!videoUrl) throw new Error("video URL is required");

  try {
    const formData = new FormData();
    formData.append('url', videoUrl);

    const res = await api.post(
      `/video/summarize_video/${encodeURIComponent(videoId)}`,
      formData,
      {
        timeout: 1800000,
        headers: {
          'X-Localization': language,
        },
      }
    );

    const root = res?.data;
    return root;
  } catch (error) {
    console.error('Error in summarizeVideo:', error);
    throw error;
  }
}


