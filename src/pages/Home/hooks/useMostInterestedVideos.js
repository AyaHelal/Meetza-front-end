import { useEffect, useMemo, useState, useContext } from "react";
import { smartToast } from "../../../API/toastManager";
import { getMostInterestedVideos } from "../services";
import { normalizeWatchProgressData } from "../../VideoSessions/services/videoSessionsService";
import { AuthContext } from "../../../context/AuthContext";

function clamp01(n) {
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.max(0, Math.min(100, x));
}

function statusFromMostInterested(v) {
  const watch = (v?.watch_status ?? "").toString().toLowerCase();
  if (watch.includes("complete")) return "completed";
  const pct = v?.progress_percentage;
  if (pct != null && clamp01(pct) >= 100) return "completed";
  return "watching";
}

function mapMostInterestedVideo(v) {
  const norm = normalizeWatchProgressData({
    data: {
      progress_seconds: v?.progress_seconds ?? v?.progressSeconds,
      watch_status: v?.watch_status ?? v?.watchStatus,
      progress_percentage: v?.progress_percentage ?? v?.progressPercentage,
    },
  });
  const progress =
    norm.progressPercentage != null ? clamp01(norm.progressPercentage) : clamp01(v?.progress_percentage);
  const merged = {
    ...v,
    watch_status: norm.watchStatus ?? v?.watch_status,
    progress_percentage: norm.progressPercentage ?? v?.progress_percentage,
  };
  return {
    id: v?.id ?? v?._id ?? v?.uuid ?? v?.slug ?? Math.random().toString(36).slice(2),
    title: v?.title ?? "Video",
    status: statusFromMostInterested(merged),
    progress,
    thumbnailUrl: v?.thumbnail_url || v?.poster_url || "",
    slug: v?.slug,
    groupId: v?.group_id,
    groupName: v?.group_name ?? v?.groupName ?? v?.group?.group_name ?? v?.group?.name,
    duration: v?.duration,
    raw: v,
  };
}

export default function useMostInterestedVideos({ search = "", enabled = true, toastOnError = true } = {}) {
  const { user } = useContext(AuthContext);
  
  const cacheKey = `home_most_interested_videos_${search}_${user?.id || 'guest'}`;

  const [videos, setVideos] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(cacheKey);
    } catch {
      return true;
    }
  });
  
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    let hasCache = false;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        setVideos(JSON.parse(cachedData));
        setLoading(false);
        hasCache = true;
      } catch (e) {}
    }

    if (!hasCache) {
      setLoading(true);
      setError(null);
    }

    getMostInterestedVideos({ search })
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list.map(mapMostInterestedVideo) : [];
        setVideos(mapped);
        localStorage.setItem(cacheKey, JSON.stringify(mapped));
        if (!hasCache) setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!hasCache) setVideos([]);
        const msg = err?.response?.data?.message || err?.message || "Failed to load videos";
        setError(msg);
        if (toastOnError && !hasCache) smartToast.error(msg);
      })
      .finally(() => {
        if (!cancelled && !hasCache) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, search, toastOnError, user?.id]);

  return useMemo(() => ({ videos, loading, error }), [videos, loading, error]);
}

