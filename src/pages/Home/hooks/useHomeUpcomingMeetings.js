import { useEffect, useMemo, useState, useContext } from "react";
import { smartToast } from "../../../API/toastManager";
import { getHomeUpcomingMeetings, mapUpcomingMeetingRow } from "../services/homeUpcomingMeetingsService";
import { AuthContext } from "../../../context/AuthContext";

export default function useHomeUpcomingMeetings({
  limit = 10,
  enabled = true,
  toastOnError = true,
} = {}) {
  const { user } = useContext(AuthContext);
  
  const [meetings, setMeetings] = useState(() => {
    try {
      const cached = localStorage.getItem(`home_upcoming_meetings_${limit}_${user?.id || 'guest'}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(`home_upcoming_meetings_${limit}_${user?.id || 'guest'}`);
    } catch {
      return true;
    }
  });
  
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;

    const cacheKey = `home_upcoming_meetings_${limit}_${user?.id || 'guest'}`;
    let hasCache = false;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        setMeetings(JSON.parse(cachedData));
        setLoading(false);
        hasCache = true;
      } catch (e) {}
    }

    if (!hasCache) {
      setLoading(true);
      setError(null);
    }

    getHomeUpcomingMeetings({ limit })
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list.map(mapUpcomingMeetingRow) : [];
        setMeetings(mapped);
        localStorage.setItem(cacheKey, JSON.stringify(mapped));
        if (!hasCache) setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!hasCache) setMeetings([]);
        const msg = err?.response?.data?.message || err?.message || "Failed to load upcoming meetings";
        setError(msg);
        if (toastOnError && !hasCache) smartToast.error(msg);
      })
      .finally(() => {
        if (!cancelled && !hasCache) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, limit, toastOnError, user?.id]);

  return useMemo(() => ({ meetings, loading, error }), [meetings, loading, error]);
}
