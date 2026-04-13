import { useEffect, useMemo, useState } from "react";
import { smartToast } from "../../../API/toastManager";
import { getHomeSavedVideos } from "../services";

function clamp01(n) {
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.max(0, Math.min(100, x));
}

function statusFromSaved(v) {
  const watch = (v?.watch_status ?? v?.watchStatus ?? "").toString().toLowerCase();
  if (watch.includes("complete")) return "completed";
  const pct = v?.progress_percentage ?? v?.progressPercentage;
  if (pct != null && clamp01(pct) >= 100) return "completed";
  return "watching";
}

function mapHomeSavedVideo(v) {
  const progressRaw = v?.progress_percentage ?? v?.progressPercentage;
  const progress = progressRaw == null ? 0 : clamp01(progressRaw);
  return {
    id: v?.id ?? v?._id ?? v?.uuid ?? v?.slug ?? Math.random().toString(36).slice(2),
    title: v?.title ?? "Video",
    status: statusFromSaved(v),
    progress,
    thumbnailUrl: v?.thumbnail_url || v?.thumbnailUrl || v?.poster_url || v?.posterUrl || "",
    slug: v?.slug,
    groupId: v?.group_id ?? v?.groupId,
    groupName: v?.group_name ?? v?.groupName ?? v?.group?.group_name ?? v?.group?.name,
    duration: v?.duration,
    raw: v,
  };
}

export default function useHomeSavedVideos({ limit = 10, enabled = true, toastOnError = true } = {}) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHomeSavedVideos({ limit })
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list.map(mapHomeSavedVideo) : [];
        setVideos(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        setVideos([]);
        const msg = err?.response?.data?.message || err?.message || "Failed to load saved videos";
        setError(msg);
        if (toastOnError) smartToast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, limit, toastOnError]);

  return useMemo(() => ({ videos, loading, error }), [videos, loading, error]);
}

