import { useEffect, useMemo, useState } from "react";
import { smartToast } from "../../../API/toastManager";
import { getHomeUpcomingMeetings, mapUpcomingMeetingRow } from "../services/homeUpcomingMeetingsService";

export default function useHomeUpcomingMeetings({
  limit = 10,
  enabled = true,
  toastOnError = true,
} = {}) {
  const [meetings, setMeetings] = useState([]);
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
    getHomeUpcomingMeetings({ limit })
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list.map(mapUpcomingMeetingRow) : [];
        setMeetings(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        setMeetings([]);
        const msg = err?.response?.data?.message || err?.message || "Failed to load upcoming meetings";
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

  return useMemo(() => ({ meetings, loading, error }), [meetings, loading, error]);
}
