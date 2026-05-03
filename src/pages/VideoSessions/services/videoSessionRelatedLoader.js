import { getVideoDetail, getRelatedVideos, getGlobalRelatedVideos } from "./videoSessionsService";

/**
 * Fetches related videos for the detail sidebar (same branching as useVideoSessionDetail).
 */
export async function fetchRelatedVideosForSession(session, useGlobalRelated) {
  if (!session?.id) return [];
  if (useGlobalRelated) {
    const relatedData = await getGlobalRelatedVideos(session.id);
    return Array.isArray(relatedData) ? relatedData : [];
  }
  const groupId = session.group_id ?? session.groupId;
  if (groupId) {
    const relatedData = await getRelatedVideos(session.id, groupId);
    return Array.isArray(relatedData) ? relatedData : [];
  }
  const data = await getVideoDetail(session.id);
  const v = data.video ?? {};
  const fallbackGroupId = v.group_id ?? v.groupId;
  if (fallbackGroupId) {
    const relatedData = await getRelatedVideos(session.id, fallbackGroupId);
    return Array.isArray(relatedData) ? relatedData : [];
  }
  return [];
}
