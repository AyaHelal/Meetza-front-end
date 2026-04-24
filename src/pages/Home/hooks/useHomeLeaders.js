import { useEffect, useMemo, useState, useContext } from "react";
import { smartToast } from "../../../API/toastManager";
import { getHomeLeaders } from "../services";
import { AuthContext } from "../../../context/AuthContext";

function toLabel(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const t = v.title ?? v.name ?? v.role ?? v.position_title ?? v.positionTitle ?? v.label;
    if (t != null) return String(t).trim();
    return "";
  }
  return "";
}

function mapLeader(row) {
  const nameLabel = toLabel(row?.name ?? row?.full_name ?? row?.username ?? row?.email) || "—";
  const roleLabel =
    toLabel(row?.role) ||
    toLabel(row?.title) ||
    toLabel(row?.position_title) ||
    toLabel(row?.position) ||
    "—";

  return {
    id: row?.id ?? row?._id ?? row?.uuid ?? row?.user_id ?? Math.random().toString(36).slice(2),
    name: nameLabel,
    role: roleLabel,
    avatarUrl:
      row?.user_photo ??
      row?.userPhoto ??
      row?.avatar_url ??
      row?.avatarUrl ??
      row?.photo_url ??
      row?.photoUrl ??
      row?.image_url ??
      row?.imageUrl ??
      "",
    raw: row,
  };
}

export default function useHomeLeaders({ enabled = true, toastOnError = true } = {}) {
  const { user } = useContext(AuthContext);
  
  const [people, setPeople] = useState(() => {
    try {
      const cached = localStorage.getItem(`home_leaders_${user?.id || 'guest'}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(`home_leaders_${user?.id || 'guest'}`);
    } catch {
      return true;
    }
  });
  
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const cacheKey = `home_leaders_${user?.id || 'guest'}`;
    let hasCache = false;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        setPeople(JSON.parse(cachedData));
        setLoading(false);
        hasCache = true;
      } catch (e) {}
    }

    if (!hasCache) {
      setLoading(true);
      setError(null);
    }

    getHomeLeaders()
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list.map(mapLeader) : [];
        
        // De-duplicate by ID to ensure React keys are unique even if API/Cache has duplicates
        const seen = new Set();
        const unique = mapped.filter((p) => {
          if (!p.id || seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        setPeople(unique);
        localStorage.setItem(cacheKey, JSON.stringify(unique));
        if (!hasCache) setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!hasCache) setPeople([]);
        const msg = err?.response?.data?.message || err?.message || "Failed to load people";
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

  return useMemo(() => ({ people, loading, error }), [people, loading, error]);
}

