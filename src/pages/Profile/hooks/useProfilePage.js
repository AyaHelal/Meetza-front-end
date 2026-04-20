import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../API/axiosInstance";
import useSavedVideos from "../../SavedVideos/hooks/useSavedVideos";
import useProfileMeetings from "./useProfileMeetings";
import useProfilePosition from "./useProfilePosition";
import { isAdminForPositions } from "../../Groups/hooks/usePositions";
import { smartToast } from "../../../API/toastManager";
import { extractUserFromToken } from "../../../utils/token";
import { getUser, patchUser } from "../services/profileUserService";
import {
  PLACEHOLDER_NOTIFICATIONS,
  PROFILE_MAX_LIVE_MEETINGS,
  PROFILE_MAX_MEETINGS,
  PROFILE_MAX_NOTIFICATIONS,
  PROFILE_MAX_SAVED_VIDEOS,
  PROFILE_PHOTO_FILE_INPUT_ID,
} from "../services/profilePageConstants";

export function useProfilePage() {
  const { user, loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { savedVideos, loading: savedVideosLoading, error: savedVideosError } = useSavedVideos(null);
  const { meetings: profileMeetings, loading: meetingsLoading, error: meetingsError } = useProfileMeetings();

  const isMemberProfile = useMemo(() => {
    const role = (user?.role || "").toString().trim().toLowerCase();
    if (!role) return true; // default to member UX when role missing
    return !(role === "administrator" || role.includes("super_admin") || role.includes("super-admin"));
  }, [user?.role]);

  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  /** Merged GET /user/:id — often carries position_id when session user is minimal. */
  const [enrichedUser, setEnrichedUser] = useState(null);

  const displayName = user?.name || user?.full_name || user?.username || user?.email || "Member";
  const email = user?.email || "—";
  const username = user?.name || user?.username || displayName;
  const contactPrefillName = user?.name || user?.full_name || user?.username || "";
  const contactPrefillEmail = user?.email || "";
  const liveMeetings = useMemo(() => (profileMeetings || []).filter((m) => m?.isLive), [profileMeetings]);
  const limitedMeetings = useMemo(() => (profileMeetings || []).slice(0, PROFILE_MAX_MEETINGS), [profileMeetings]);
  const limitedSavedVideos = useMemo(() => (savedVideos || []).slice(0, PROFILE_MAX_SAVED_VIDEOS), [savedVideos]);
  const limitedLiveMeetings = useMemo(() => liveMeetings.slice(0, PROFILE_MAX_LIVE_MEETINGS), [liveMeetings]);
  const limitedNotifications = useMemo(() => PLACEHOLDER_NOTIFICATIONS.slice(0, PROFILE_MAX_NOTIFICATIONS), []);
  const hasSavedVideos = (savedVideos || []).length > 0;
  const [groupsMap, setGroupsMap] = useState(() => ({}));

  useEffect(() => {
    let cancelled = false;
    const userRole = (user?.role || "").toString().trim().toLowerCase();
    const isAdminRole =
      userRole === "administrator" || userRole.includes("super_admin") || userRole.includes("super-admin");
    const endpoint = isAdminRole ? "/group" : "/chat/groups";

    api
      .get(endpoint)
      .then((response) => {
        if (cancelled) return;
        const raw = response?.data?.data ?? response?.data;
        const payload = Array.isArray(raw) ? raw : [];
        const map = {};
        payload.forEach((g) => {
          const id = g.id ?? g.group_id ?? g._id;
          const name = g.name ?? g.group_name ?? g.title ?? g.content_name ?? g.group_content_name ?? "";
          if (id != null && String(id).trim() !== "") {
            const idStr = String(id);
            if (map[idStr] !== undefined) return;
            const nameStr = name && String(name).trim() ? String(name).trim() : "—";
            map[idStr] = nameStr;
          }
        });
        setGroupsMap(map);
      })
      .catch(() => {
        if (!cancelled) setGroupsMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const handleJoinLiveMeeting = useCallback(async (meetingId) => {
    const id = meetingId != null ? String(meetingId) : null;
    if (!id) return;
    try {
      await api.post(`/meeting/${id}/join`);
      try {
        sessionStorage.setItem("activeMeetingId", String(id));
      } catch {
        /* ignore */
      }
      navigate("/meetings", { state: { meetingId: id } });
    } catch (err) {
      smartToast.error(err?.response?.data?.message || "Failed to join meeting");
    }
  }, [navigate]);

  const effectiveUser = useMemo(() => {
    if (!user && !enrichedUser) return null;
    const base = user && typeof user === "object" ? { ...user } : {};
    if (!enrichedUser || typeof enrichedUser !== "object") return base;
    Object.keys(enrichedUser).forEach((k) => {
      const v = enrichedUser[k];
      if (v !== undefined) base[k] = v;
    });
    return base;
  }, [user, enrichedUser]);

  const showPositionProfileSection = useMemo(
    () => isAdminForPositions(effectiveUser || user),
    [effectiveUser, user]
  );

  const userId = useMemo(() => {
    const fromUser = user?.id ?? user?.user_id ?? user?._id ?? user?.uuid;
    if (fromUser != null && String(fromUser).trim() !== "") return String(fromUser).trim();
    const fromToken = extractUserFromToken()?.id;
    if (fromToken != null && String(fromToken).trim() !== "") return String(fromToken).trim();
    return null;
  }, [user]);

  useEffect(() => {
    if (!userId) {
      setEnrichedUser(null);
      return undefined;
    }
    let cancelled = false;
    getUser(userId)
      .then((u) => {
        if (cancelled || !u || typeof u !== "object") return;
        setEnrichedUser(u);
      })
      .catch(() => {
        if (!cancelled) setEnrichedUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const startNameEdit = useCallback(() => {
    const initial = (user?.name || user?.full_name || user?.username || "").trim();
    setNameDraft(initial);
    setNameEditing(true);
  }, [user?.name, user?.full_name, user?.username]);

  const cancelNameEdit = useCallback(() => {
    if (nameSaving) return;
    setNameEditing(false);
  }, [nameSaving]);

  const persistUser = useCallback(
    (patch) => {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const rememberMe = localStorage.getItem("remember") === "true";
      loginUser({ ...user, ...patch }, token, rememberMe);
    },
    [user, loginUser]
  );

  const handleSaveName = useCallback(async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      smartToast.error("Please enter a name.");
      return;
    }
    if (!userId) {
      smartToast.error("User ID not found.");
      return;
    }
    setNameSaving(true);
    try {
      const { patchPayload } = await patchUser(userId, { name: trimmed });
      persistUser({
        ...(patchPayload && typeof patchPayload === "object" ? patchPayload : {}),
        name: patchPayload?.name ?? trimmed,
        full_name: patchPayload?.full_name ?? patchPayload?.name ?? trimmed,
      });
      setNameEditing(false);
      smartToast.success("Name updated");
    } catch (err) {
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  }, [nameDraft, userId, persistUser]);

  const {
    positionPutId,
    positionLabel,
    positionFetchLoading,
    positionFetchError,
    positionEditing,
    positionDraft,
    setPositionDraft,
    positionSaving,
    startPositionEdit,
    cancelPositionEdit,
    handleSavePosition,
    positionDeleting,
    showDeletePositionModal,
    openDeletePositionModal,
    closeDeletePositionModal,
    confirmDeletePosition,
  } = useProfilePosition({
    effectiveUser,
    userId,
    showPositionProfileSection,
    persistUser,
    setEnrichedUser,
  });

  const triggerPhotoPicker = useCallback(() => {
    const el = document.getElementById(PROFILE_PHOTO_FILE_INPUT_ID);
    if (el && typeof el.click === "function") el.click();
    else smartToast.error("Could not open file picker.");
  }, []);

  return {
    user,
    navigate,
    savedVideos,
    savedVideosLoading,
    savedVideosError,
    profileMeetings,
    meetingsLoading,
    meetingsError,
    isMemberProfile,
    nameEditing,
    nameDraft,
    setNameDraft,
    nameSaving,
    contactModalOpen,
    setContactModalOpen,
    displayName,
    email,
    username,
    contactPrefillName,
    contactPrefillEmail,
    limitedMeetings,
    limitedSavedVideos,
    limitedLiveMeetings,
    limitedNotifications,
    hasSavedVideos,
    groupsMap,
    handleJoinLiveMeeting,
    effectiveUser,
    showPositionProfileSection,
    startNameEdit,
    cancelNameEdit,
    handleSaveName,
    positionPutId,
    positionLabel,
    positionFetchLoading,
    positionFetchError,
    positionEditing,
    positionDraft,
    setPositionDraft,
    positionSaving,
    startPositionEdit,
    cancelPositionEdit,
    handleSavePosition,
    positionDeleting,
    showDeletePositionModal,
    openDeletePositionModal,
    closeDeletePositionModal,
    confirmDeletePosition,
    triggerPhotoPicker,
    profilePhotoFileInputId: PROFILE_PHOTO_FILE_INPUT_ID,
  };
}
