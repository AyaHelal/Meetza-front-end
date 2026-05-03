import { useCallback, useEffect, useState, useContext } from "react";
import { useSocket } from "../../../context/SocketContext";
import { getSavedVideos } from "../services/savedVideosService";
import { deleteSavedVideo } from "../../VideoSessions/services";
import { smartToast } from "../../../API/toastManager";
import { AuthContext } from "../../../context/AuthContext";

export default function useSavedVideos(groupId = null) {
  const { socket } = useSocket();
  const { user } = useContext(AuthContext);
  const [savedVideos, setSavedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const refetch = useCallback(async () => {
    const cacheKey = `saved_videos_cache_${groupId || 'all'}_${user?.id || 'guest'}`;
    let hasCache = false;

    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setSavedVideos(parsed);
        setLoading(false);
        hasCache = true;
      } catch (e) {
        console.error("Failed to parse saved videos cache", e);
      }
    }

    if (!hasCache) {
      setLoading(true);
      setError(null);
    }

    try {
      const list = await getSavedVideos(groupId);
      const videos = Array.isArray(list) ? list : [];
      setSavedVideos(videos);
      localStorage.setItem(cacheKey, JSON.stringify(videos));
      if (!hasCache) setError(null);
    } catch (err) {
      setError(err?.message || "Failed to load saved videos");
      if (!hasCache) setSavedVideos([]);
    } finally {
      if (!hasCache) setLoading(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refetch when save status changes (optional but improves UX).
  useEffect(() => {
    if (!socket) return;
    const events = ["videoSavedUpdated", "videoSavedUpdated", "videoSaved"]; // be tolerant
    const handler = () => refetch();
    events.forEach((e) => socket.on?.(e, handler));
    return () => events.forEach((e) => socket.off?.(e, handler));
  }, [socket, refetch]);

  const removeFromSaved = useCallback(async (videoId) => {
    if (!videoId) return;
    const id = String(videoId);
    setRemovingId(id);
    // Optimistic UI: remove immediately.
    setSavedVideos((prev) => prev.filter((v) => String(v?.id) !== id));
    try {
      await deleteSavedVideo(videoId);
      smartToast?.success?.("Removed from saved videos");
    } catch (err) {
      // Re-sync from server if delete fails.
      smartToast?.error?.(err?.response?.data?.message || err?.message || "Failed to remove");
      refetch();
    } finally {
      setRemovingId(null);
    }
  }, [refetch]);

  return { savedVideos, loading, error, refetch, removeFromSaved, removingId };
}

