import { useEffect, useMemo, useState, useContext } from "react";
import { smartToast } from "../../../API/toastManager";
import { getHomeStats } from "../services/homeStatsService";
import { AuthContext } from "../../../context/AuthContext";

export default function useHomeStats({ enabled = true, toastOnError = true } = {}) {
  const { user } = useContext(AuthContext);
  
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(`home_stats_${user?.id || 'guest'}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(`home_stats_${user?.id || 'guest'}`);
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
    
    const cacheKey = `home_stats_${user?.id || 'guest'}`;
    let hasCache = false;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        setData(JSON.parse(cachedData));
        setLoading(false);
        hasCache = true;
      } catch (e) {}
    }

    if (!hasCache) {
      setLoading(true);
      setError(null);
    }

    getHomeStats()
      .then((payload) => {
        if (cancelled) return;
        const result = payload && typeof payload === "object" ? payload : {};
        setData(result);
        localStorage.setItem(cacheKey, JSON.stringify(result));
        if (!hasCache) setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!hasCache) setData(null);
        const msg = err?.response?.data?.message || err?.message || "Failed to load stats";
        setError(msg);
        if (toastOnError && !hasCache) smartToast.error(msg);
      })
      .finally(() => {
        if (!cancelled && !hasCache) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, toastOnError, user?.id]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}
