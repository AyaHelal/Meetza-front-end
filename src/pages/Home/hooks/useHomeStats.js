import { useEffect, useMemo, useState } from "react";
import { smartToast } from "../../../API/toastManager";
import { getHomeStats } from "../services/homeStatsService";

export default function useHomeStats({ enabled = true, toastOnError = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHomeStats()
      .then((payload) => {
        if (!cancelled) setData(payload && typeof payload === "object" ? payload : {});
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        const msg = err?.response?.data?.message || err?.message || "Failed to load stats";
        setError(msg);
        if (toastOnError) smartToast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, toastOnError]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}
