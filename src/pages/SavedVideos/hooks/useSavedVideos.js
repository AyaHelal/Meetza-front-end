import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../../../context/SocketContext";
import { getSavedVideos } from "../services/savedVideosService";
import { deleteSavedVideo } from "../../VideoSessions/services";
import { smartToast } from "../../../API/toastManager";

export default function useSavedVideos(groupId = null) {
  const { socket } = useSocket();
  const [savedVideos, setSavedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getSavedVideos(groupId);
      setSavedVideos(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || "Failed to load saved videos");
      setSavedVideos([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

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

