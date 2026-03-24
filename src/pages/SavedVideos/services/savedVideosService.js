import api from "../../../API/axiosInstance";

function pickSavedVideosList(root) {
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.data?.data)) return root.data.data;
  return [];
}

function mapSavedVideoItem(item) {
  const v = item?.video ?? item?.Video ?? item?.video_data ?? item ?? {};
  const id = v?.id ?? item?.video_id ?? item?.videoId ?? item?.id ?? null;
  const title = v?.title ?? item?.title ?? "Video";
  const instructor = item?.admin_name ?? item?.adminName ?? v?.admin_name ?? v?.adminName ?? v?.admin?.name ?? null;
  const savedAt = item?.saved_at ?? item?.savedAt ?? item?.created_at ?? item?.createdAt ?? null;

  return {
    ...v,
    id,
    title,
    instructor,
    thumbnailUrl: v?.poster_url ?? v?.thumbnail_url ?? v?.thumbnail ?? v?.cover_url ?? null,
    videoUrl: v?.video_url ?? v?.videoUrl ?? v?.url ?? null,
    duration: v?.duration ?? v?.duration_seconds ?? null,
    savedAt,
    createdAt: savedAt,
  };
}

export async function getSavedVideos(groupId = null) {
  let res;
  const params = groupId ? { group_id: groupId } : {};

  try {
    res = await api.get("/saved_video/user", { params });
  } catch (err) {
    if (err?.response?.status !== 404) throw err;

    try {
      res = await api.get("/saved_video/user/", { params });
    } catch (err2) {
      if (err2?.response?.status !== 404) throw err2;

      try {
        res = await api.get("/saved_video", { params });
      } catch (err3) {
        if (err3?.response?.status !== 404) throw err3;
        res = await api.get("/saved_video/", { params });
      }
    }
  }

  const root = res?.data;
  const list = pickSavedVideosList(root);
  return list.map(mapSavedVideoItem).filter((v) => v?.id != null);
}

