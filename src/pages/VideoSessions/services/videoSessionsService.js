import api from "../../../API/axiosInstance";

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

/**
 * Parse /video API response into a consistent session shape for UI.
 */
export function parseSession(raw) {
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
 * Create a comment for a video.
 * POST /comment { video_id, comment_text }
 */
export async function createComment(videoId, commentText) {
  if (!videoId) throw new Error("video id is required");
  if (!commentText || !commentText.toString().trim()) throw new Error("comment_text is required");
  const res = await api.post("/comment", {
    video_id: videoId,
    comment_text: commentText.toString().trim(),
  });
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
 * POST /like { video_id, like_type }
 */
export async function createLike(videoId, likeType) {
  if (!videoId) throw new Error("video id is required");
  if (typeof likeType !== "number" || ![0, 1].includes(likeType)) {
    throw new Error("likeType must be 0 (dislike) or 1 (like)");
  }

  const res = await api.post("/like", {
    video_id: videoId,
    like_type: likeType,
  });

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


