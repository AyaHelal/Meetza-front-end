import api, { API_BASE_URL } from "../../../API/axiosInstance";
import axios from "axios";

let savedVideosCache = { ts: 0, ids: null };

function pickSavedVideosList(root) {
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.data?.data)) return root.data.data;
  return [];
}

function extractVideoId(item) {
  const v = item?.video ?? item?.Video ?? item?.video_data ?? item ?? {};
  return v?.id ?? item?.video_id ?? item?.videoId ?? item?.id ?? null;
}

async function fetchSavedVideoIdsForUser() {
  let res;
  try {
    res = await api.get("/saved_video/user");
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    try {
      res = await api.get("/saved_video/user/");
    } catch (err2) {
      if (err2?.response?.status !== 404) throw err2;
      try {
        res = await api.get("/saved_video");
      } catch (err3) {
        if (err3?.response?.status !== 404) throw err3;
        res = await api.get("/saved_video/");
      }
    }
  }
  const root = res?.data;
  const list = pickSavedVideosList(root);
  const ids = new Set();
  list.forEach((item) => {
    const id = extractVideoId(item);
    if (id != null && id !== "") ids.add(String(id));
  });
  return ids;
}

export async function isVideoSavedByUser(videoId, { maxAgeMs = 30000 } = {}) {
  if (!videoId) return false;
  const now = Date.now();
  const hasFreshCache = savedVideosCache.ids instanceof Set && (now - (savedVideosCache.ts || 0)) < maxAgeMs;
  if (!hasFreshCache) {
    const ids = await fetchSavedVideoIdsForUser();
    savedVideosCache = { ts: now, ids };
  }
  return savedVideosCache.ids?.has(String(videoId)) === true;
}

export function invalidateSavedVideosCache() {
  savedVideosCache = { ts: 0, ids: null };
}

/**
 * Build full URL for a file (e.g. video_url). If url is relative, prepends API base.
 */
export function buildFileUrl(url) {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = (API_BASE_URL || "").replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return base ? `${base}${path}` : path;
}

/**
 * Fetch videos for Video Sessions page.
 * Uses backend GET /video with optional ?group_id=.
 */
export async function getVideoSessions(groupId = null, q = "") {
  const normalizedGroupId = groupId?.toString?.().trim?.();
  const searchTerm = q?.toString?.().trim?.();

  // STRICT RULE: If a search is intended (not empty) but too short, do NOT call API.
  if (searchTerm && searchTerm.length > 0 && searchTerm.length < 3) {
    return [];
  }

  const params = {};
  if (normalizedGroupId) params.group_id = normalizedGroupId;
  if (searchTerm && searchTerm.length >= 3) params.q = searchTerm;

  const res = await api.get("/video", { params });
  const root = res?.data;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  return [];
}

/** Format seconds as HH:MM:SS or MM:SS for display */
function formatDurationForDisplay(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() !== "" && !value.match(/^\d+(\.\d+)?$/)) return value;
  const sec = typeof value === "number" ? Math.ceil(value) : Math.ceil(parseFloat(String(value).trim()));
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
/**
 * Seconds watched / resume position from API or embedded video fields (flexible shapes).
 */
export function extractWatchProgressSeconds(value) {
  if (value == null) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return Math.max(0, value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = parseFloat(value);
    if (!Number.isNaN(n)) return Math.max(0, n);
    return null;
  }
  if (typeof value === "object") {
    const o = value?.data != null && typeof value.data === "object" ? value.data : value;
    const sec =
      o.watched_seconds ??
      o.watchedSeconds ??
      o.position_seconds ??
      o.positionSeconds ??
      o.current_time ??
      o.currentTime ??
      o.seconds ??
      o.progress_seconds ??
      o.progressSeconds ??
      o.last_position ??
      o.lastPosition ??
      o.current_position ??
      o.currentPosition ??
      o.time_watched ??
      o.timeWatched ??
      o.watched_duration ??
      o.watchedDuration;
    return extractWatchProgressSeconds(sec);
  }
  return null;
}

function watchProgressPath(videoId) {
  return `/video/${encodeURIComponent(videoId)}/watch-progress`;
}

/**
 * Normalize API `data` for watch progress (GET response or PUT response).
 * `data === null` → start from 0, no status.
 */
export function normalizeWatchProgressData(root) {
  if (root == null) {
    return { progressSeconds: 0, watchStatus: null, progressPercentage: null };
  }
  const d = root?.data !== undefined ? root.data : root;
  if (d == null) {
    return { progressSeconds: 0, watchStatus: null, progressPercentage: null };
  }
  if (typeof d !== "object") {
    return { progressSeconds: 0, watchStatus: null, progressPercentage: null };
  }
  const ps = d.progress_seconds ?? d.progressSeconds;
  let progressSeconds = 0;
  if (typeof ps === "number" && !Number.isNaN(ps)) progressSeconds = Math.max(0, Math.floor(ps));
  else if (typeof ps === "string" && ps.trim() !== "") {
    const n = parseInt(ps, 10);
    if (!Number.isNaN(n)) progressSeconds = Math.max(0, n);
  }
  const ws = d.watch_status ?? d.watchStatus ?? null;
  const watchStatus = ws != null && String(ws).trim() !== "" ? String(ws) : null;
  const pp = d.progress_percentage ?? d.progressPercentage;
  let progressPercentage = null;
  if (typeof pp === "number" && !Number.isNaN(pp)) progressPercentage = Math.max(0, Math.min(100, pp));
  else if (typeof pp === "string" && pp.trim() !== "") {
    const n = parseFloat(pp);
    if (!Number.isNaN(n)) progressPercentage = Math.max(0, Math.min(100, n));
  }
  return { progressSeconds, watchStatus, progressPercentage };
}

/**
 * GET /video/:id/watch-progress — resume + UI fields (watch_status, progress_percentage).
 */
export async function getVideoWatchProgress(videoId) {
  if (!videoId) return normalizeWatchProgressData(null);
  try {
    const res = await api.get(watchProgressPath(videoId));
    return normalizeWatchProgressData(res?.data);
  } catch (err) {
    if (err?.response?.status === 404) return normalizeWatchProgressData(null);
    console.warn("getVideoWatchProgress failed", err);
    return normalizeWatchProgressData(null);
  }
}

/**
 * PUT /video/:id/watch-progress — send only fields you include.
 * Examples: `{ progress_seconds: 120 }`, `{ completed: true }`, or both.
 * Number shorthand → `{ progress_seconds: n }`.
 */
export async function putVideoWatchProgress(videoId, payload) {
  if (!videoId) throw new Error("video id is required");
  const body = {};
  if (typeof payload === "number" && !Number.isNaN(payload)) {
    body.progress_seconds = Math.max(0, Math.floor(payload));
  } else if (payload != null && typeof payload === "object" && !Array.isArray(payload)) {
    if ("progress_seconds" in payload && payload.progress_seconds != null && payload.progress_seconds !== "") {
      const n = Number(payload.progress_seconds);
      if (!Number.isNaN(n)) body.progress_seconds = Math.max(0, Math.floor(n));
    }
    if (!("progress_seconds" in body) && "progressSeconds" in payload && payload.progressSeconds != null) {
      const n = Number(payload.progressSeconds);
      if (!Number.isNaN(n)) body.progress_seconds = Math.max(0, Math.floor(n));
    }
    if ("completed" in payload && payload.completed !== undefined && payload.completed !== null) {
      const c = payload.completed;
      body.completed = Boolean(c === true || c === 1 || c === "1" || String(c).toLowerCase() === "true");
    }
  }
  if (Object.keys(body).length === 0) {
    throw new Error("PUT watch-progress: include progress_seconds and/or completed");
  }
  const res = await api.put(watchProgressPath(videoId), body);
  return normalizeWatchProgressData(res?.data);
}

/**
 * DELETE /video/:id/watch-progress — reset/remove progress for current user.
 */
export async function deleteVideoWatchProgress(videoId) {
  if (!videoId) throw new Error("video id is required");
  const res = await api.delete(watchProgressPath(videoId));
  return res?.data?.data ?? res?.data ?? res;
}

export function parseSession(raw) {
  const durationRaw = raw.duration ?? raw.duration_seconds ?? null;
  const duration = formatDurationForDisplay(durationRaw) ?? durationRaw;
  const groupName =
    raw.group_name ??
    raw.groupName ??
    raw.group?.group_name ??
    raw.group?.name ??
    null;
  const groupId = raw.group_id ?? raw.groupId ?? raw.group?.id ?? null;

  const nestedWp = raw.watch_progress ?? raw.watchProgress;
  const embedSec = extractWatchProgressSeconds(
    nestedWp ??
    raw.watch_progress ??
    raw.watchProgress ??
    raw.watch_progress_seconds ??
    raw.watchProgressSeconds
  );
  const normFromList =
    nestedWp != null && typeof nestedWp === "object"
      ? normalizeWatchProgressData({ data: nestedWp })
      : normalizeWatchProgressData({
        data: {
          progress_seconds: raw.progress_seconds ?? raw.progressSeconds,
          watch_status: raw.watch_status ?? raw.watchStatus,
          progress_percentage: raw.progress_percentage ?? raw.progressPercentage,
        },
      });
  const watchProgressSeconds = embedSec != null ? embedSec : normFromList.progressSeconds;
  const watchStatus = normFromList.watchStatus;
  const progressPercentage = normFromList.progressPercentage;

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
    group_id: groupId,
    group_name: groupName,
    groupName,
    watchProgressSeconds,
    watchStatus,
    progressPercentage,
    status: raw.status ?? "completed",
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    transcript: typeof raw.transcript === 'string' ? raw.transcript : null,
  };
}

/**
 * Fetch full details for a single video by id.
 * Uses backend GET /video/:id and returns the parsed payload.
 */
export async function getVideoDetail(id, lang = null) {
  if (!id) throw new Error("video id is required");
  const config = lang ? { headers: { 'X-Localization': lang } } : {};
  const res = await api.get(`/video/${id}`, config);
  const root = res?.data;
  // Backend shape: { success, data: { video, admin, likes_count, ... } }
  return root?.data ?? root;
}

export async function getVideoBySlug(slug) {
  if (!slug) throw new Error("video slug is required");
  const safe = String(slug).trim();
  const res = await api.get(`/video/${encodeURIComponent(safe)}`);
  const root = res?.data;
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

  const id = encodeURIComponent(videoId);
  try {
    const res = await api.delete(`/saved_video/${id}`);
    return res?.data;
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
  }

  try {
    const res = await api.delete(`/saved_video/${id}/`);
    return res?.data;
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
  }

  try {
    const res = await api.delete("/saved_video", { data: { video_id: videoId } });
    return res?.data;
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
  }

  const res = await api.delete("/saved_video/", { data: { video_id: videoId } });
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
    ? Math.ceil(duration_seconds)
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


