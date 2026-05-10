/**
 * Maps initial GET video detail + watch progress into detail state shape.
 */
export function buildParsedVideoDetail({
  session,
  v,
  data,
  admin,
  finalCommentCount,
  resumeSec,
  watchState,
}) {
  return {
    title: v.title ?? session.title,
    description: data.description ?? v.description ?? session.description,
    instructor: admin.name ?? session.instructor,
    thumbnailUrl: v.poster_url ?? session.thumbnailUrl,
    videoUrl: v.video_url ?? session.videoUrl,
    likesCount: data.likes_count ?? 0,
    dislikesCount: data.dislikes_count ?? 0,
    savedCount: data.saved_count ?? 0,
    commentCount: finalCommentCount,
    topics: data.topics ?? session.topics ?? { ar: [], en: [] },
    groupName: v.group_name ?? session?.groupName ?? session?.group_name ?? null,
    group_id: v.group_id ?? session?.group_id ?? session?.groupId ?? null,
    watchProgressSeconds: resumeSec,
    watchStatus: watchState.watchStatus,
    progressPercentage: watchState.progressPercentage,
    detailVideoId: session.id,
    summary: data.summary ?? v.summary ?? null,
    transcript: data.transcript ?? v.transcript ?? null,
    status: data.status ?? v.status ?? "completed",
  };
}

export function extractLikeDislikeState(data, v) {
  const likeId = data.like_id ?? data.user_like_id ?? data.like?.id ?? v.like_id ?? null;
  const isLiked =
    data.user_like ??
    data.is_liked ??
    data.user_liked ??
    data.liked ??
    data.has_liked ??
    v.user_like ??
    v.is_liked ??
    false;
  const isDisliked =
    data.user_dislike ??
    data.is_disliked ??
    data.user_disliked ??
    data.disliked ??
    data.has_disliked ??
    v.user_dislike ??
    v.is_disliked ??
    false;
  return { likeId: likeId || null, isLiked: Boolean(isLiked), isDisliked: Boolean(isDisliked) };
}

/**
 * Socket refresh merge — uses current `detail` from closure for fallbacks (same as original hook).
 */
export function mergeSocketVideoDetail(prev, detail, session, data, commentsData) {
  const v = data.video ?? {};
  const parsed = {
    title: v.title ?? detail?.title,
    description: data.description ?? v.description ?? detail?.description,
    instructor: (data.admin?.name ?? detail?.instructor) || detail?.instructor,
    thumbnailUrl: v.poster_url ?? detail?.thumbnailUrl,
    videoUrl: v.video_url ?? detail?.videoUrl,
    likesCount: data.likes_count ?? detail?.likesCount ?? 0,
    dislikesCount: data.dislikes_count ?? detail?.dislikesCount ?? 0,
    savedCount: data.saved_count ?? detail?.savedCount ?? 0,
    commentCount:
      data.commentCount ?? (Array.isArray(data.comments) ? data.comments.length : detail?.commentCount ?? 0),
    topics: data.topics ?? detail?.topics ?? session?.topics ?? { ar: [], en: [] },
    groupName: v.group_name ?? detail?.groupName ?? session?.groupName ?? session?.group_name ?? null,
    group_id: v.group_id ?? detail?.group_id ?? session?.group_id ?? null,
    summary: data.summary ?? v.summary ?? null,
    transcript: data.transcript ?? v.transcript ?? null,
    status: data.status ?? v.status ?? detail?.status ?? "completed",
  };
  return {
    ...prev,
    ...parsed,
    commentCount: commentsData.commentCount ?? parsed.commentCount,
    watchProgressSeconds: prev?.watchProgressSeconds,
    watchStatus: prev?.watchStatus,
    progressPercentage: prev?.progressPercentage,
    detailVideoId: prev?.detailVideoId ?? session.id,
  };
}
