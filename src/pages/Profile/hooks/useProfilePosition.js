import { useCallback, useEffect, useMemo, useState } from "react";
import { smartToast } from "../../../API/toastManager";
import { extractUserFromToken } from "../../../utils/token";
import {
  deletePosition,
  getPositionsList,
  getUser,
  postPosition,
  positionRecordId,
  putPosition,
  resolveProfilePositionRow,
} from "../services/profileUserService";

/** Position row: only real position fields from API — not role. */
function positionDisplayFromUser(user) {
  if (!user) return "No positions available";
  const raw = user.position ?? user.position_title ?? user.positionTitle ?? user.Position;
  if (raw != null && typeof raw === "object") {
    const t = (raw.title ?? raw.Title ?? raw.name ?? raw.position_name)?.toString?.().trim?.();
    if (t) return t;
  }
  if (raw != null && String(raw).trim() !== "") return String(raw).trim();
  const flat =
    user.position_name ??
    user.positionName ??
    user.position_title ??
    user.positionTitle ??
    user.job_title ??
    user.jobTitle;
  if (flat != null && String(flat).trim() !== "") return String(flat).trim();
  return "No positions available";
}

function positionIdFromUser(user) {
  if (!user) return null;
  const flatIds = [
    user.position_id,
    user.positionId,
    user.PositionId,
    user.user_position_id,
    user.userPositionId,
    user.fk_position_id,
    user.profile?.position_id,
    user.Profile?.position_id,
    user.data?.position_id,
  ];
  for (const v of flatIds) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  const p = user.position ?? user.Position;
  if (p != null && typeof p === "object") {
    const id = p.id ?? p.position_id ?? p.uuid ?? p._id;
    if (id != null && String(id).trim() !== "") return String(id).trim();
  }
  const fromToken = extractUserFromToken()?.position_id;
  if (fromToken != null && String(fromToken).trim() !== "") return String(fromToken).trim();
  return null;
}

function positionTitleDraftFromUser(user) {
  const raw = user?.position ?? user?.Position ?? user?.position_title ?? user?.positionTitle;
  if (raw != null && typeof raw === "object") {
    const t = (raw.title ?? raw.Title ?? raw.name)?.toString?.().trim?.();
    if (t) return t;
  }
  if (raw != null && String(raw).trim() !== "") return String(raw).trim();
  const flat =
    user?.position_name ??
    user?.positionName ??
    user?.position_title ??
    user?.positionTitle ??
    user?.job_title ??
    user?.jobTitle;
  return flat != null ? String(flat).trim() : "";
}

function positionTitleFromDetail(detail) {
  if (!detail || typeof detail !== "object") return "";
  const t =
    detail.title ??
    detail.Title ??
    detail.name ??
    detail.position_title ??
    detail.positionTitle ??
    detail.position_name ??
    detail.positionName ??
    detail.label ??
    detail.job_title ??
    detail.jobTitle;
  return t != null ? String(t).trim() : "";
}

export default function useProfilePosition({
  effectiveUser,
  userId,
  showPositionProfileSection,
  persistUser,
}) {
  const [positionEditing, setPositionEditing] = useState(false);
  const [positionDraft, setPositionDraft] = useState("");
  const [positionSaving, setPositionSaving] = useState(false);
  const [positionDeleting, setPositionDeleting] = useState(false);
  const [showDeletePositionModal, setShowDeletePositionModal] = useState(false);
  const [positionsList, setPositionsList] = useState([]);
  const [positionFetchLoading, setPositionFetchLoading] = useState(false);
  const [positionFetchError, setPositionFetchError] = useState(null);

  const positionId = useMemo(() => positionIdFromUser(effectiveUser), [effectiveUser]);

  const positionDetail = useMemo(
    () => resolveProfilePositionRow(positionsList, positionId, userId),
    [positionsList, positionId, userId]
  );

  /** PUT target id — from matched list row (e.g. `title` row) or user's position_id. */
  const positionPutId = useMemo(
    () => positionRecordId(positionDetail) || positionId || null,
    [positionDetail, positionId]
  );

  const positionLabel = useMemo(() => {
    const fromApi = positionTitleFromDetail(positionDetail);
    if (fromApi) return fromApi;
    return positionDisplayFromUser(effectiveUser);
  }, [positionDetail, effectiveUser]);

  useEffect(() => {
    if (!userId || !showPositionProfileSection) {
      setPositionsList([]);
      setPositionFetchLoading(false);
      setPositionFetchError(null);
      return undefined;
    }
    let cancelled = false;
    setPositionFetchLoading(true);
    setPositionFetchError(null);
    getPositionsList()
      .then((list) => {
        if (cancelled) return;
        setPositionsList(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setPositionsList([]);
        setPositionFetchError(err?.response?.data?.message || err?.message || "Failed to load positions");
      })
      .finally(() => {
        if (!cancelled) setPositionFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, showPositionProfileSection]);

  const startPositionEdit = useCallback(() => {
    const fromFetch = positionTitleFromDetail(positionDetail);
    setPositionDraft(fromFetch || positionTitleDraftFromUser(effectiveUser));
    setPositionEditing(true);
  }, [effectiveUser, positionDetail]);

  const cancelPositionEdit = useCallback(() => {
    if (positionSaving) return;
    setPositionEditing(false);
  }, [positionSaving]);

  const handleSavePosition = useCallback(async () => {
    const trimmed = positionDraft.trim();
    if (!trimmed) {
      smartToast.error('Please enter a position title.');
      return;
    }
    setPositionSaving(true);
    try {
      const isCreate = !positionPutId;
      const { positionPayload } = isCreate
        ? await postPosition({
            title: trimmed,
            administrator_id: userId || undefined,
            administratorId: userId || undefined,
          })
        : await putPosition(positionPutId, { title: trimmed });

      const createdId = positionRecordId(positionPayload) || null;
      const targetId = createdId || positionPutId || null;
      const prevPos =
        positionDetail && typeof positionDetail === "object"
          ? positionDetail
          : effectiveUser?.position && typeof effectiveUser.position === "object"
            ? effectiveUser.position
            : {};
      const merged =
        positionPayload && typeof positionPayload === "object"
          ? { ...prevPos, ...positionPayload, title: positionPayload.title ?? trimmed }
          : { ...prevPos, ...(targetId ? { id: targetId } : {}), title: trimmed };

      setPositionsList((prev) => {
        const idKey = String(merged.id ?? targetId ?? "");
        if (!idKey) return prev;
        const idx = prev.findIndex((p) => String(positionRecordId(p)) === idKey);
        if (idx < 0) return [...prev, merged];
        const next = [...prev];
        next[idx] = { ...next[idx], ...merged };
        return next;
      });

      persistUser({
        position: merged,
        position_id: merged.id ?? targetId,
        position_title: merged.title ?? trimmed,
      });
      setPositionEditing(false);
      smartToast.success(isCreate ? "Position created" : "Position updated");
    } catch (err) {
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to update position");
    } finally {
      setPositionSaving(false);
    }
  }, [positionDraft, positionPutId, userId, positionDetail, effectiveUser, persistUser]);

  const openDeletePositionModal = useCallback(() => {
    if (!positionPutId) {
      smartToast.error("No position available to delete.");
      return;
    }
    setShowDeletePositionModal(true);
  }, [positionPutId]);

  const closeDeletePositionModal = useCallback(() => {
    if (positionDeleting) return;
    setShowDeletePositionModal(false);
  }, [positionDeleting]);

  const confirmDeletePosition = useCallback(async () => {
    if (!positionPutId) {
      smartToast.error("No position available to delete.");
      return;
    }
    setPositionDeleting(true);
    try {
      const idKey = String(positionPutId);
      await deletePosition(positionPutId);
      setPositionsList((prev) =>
        Array.isArray(prev) ? prev.filter((p) => String(positionRecordId(p)) !== idKey) : []
      );
      persistUser({
        position: null,
        Position: null,
        position_id: null,
        positionId: null,
        position_title: null,
        positionTitle: null,
        position_name: null,
        positionName: null,
      });
      setPositionEditing(false);
      setShowDeletePositionModal(false);
      smartToast.success("Position deleted");
    } catch (err) {
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to delete position");
    } finally {
      setPositionDeleting(false);
    }
  }, [positionPutId, persistUser, userId]);

  return {
    // derived
    positionPutId,
    positionLabel,
    positionFetchLoading,
    positionFetchError,

    // edit state
    positionEditing,
    positionDraft,
    setPositionDraft,
    positionSaving,
    startPositionEdit,
    cancelPositionEdit,
    handleSavePosition,

    // delete modal
    positionDeleting,
    showDeletePositionModal,
    openDeletePositionModal,
    closeDeletePositionModal,
    confirmDeletePosition,
  };
}

