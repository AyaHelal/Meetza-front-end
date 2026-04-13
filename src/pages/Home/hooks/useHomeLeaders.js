import { useEffect, useMemo, useState } from "react";
import { smartToast } from "../../../API/toastManager";
import { getHomeLeaders } from "../services";

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
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHomeLeaders()
      .then((list) => {
        if (cancelled) return;
        const mapped = Array.isArray(list) ? list.map(mapLeader) : [];
        setPeople(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        setPeople([]);
        const msg = err?.response?.data?.message || err?.message || "Failed to load people";
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

  return useMemo(() => ({ people, loading, error }), [people, loading, error]);
}

