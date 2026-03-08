import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMeetingsByGroupId,
  getMeetingById,
  joinMeeting,
} from "../services/mainChatService";
import { isMeetingCurrentlyActive, getMeetingId } from "../utils/mainChatMeetingUtils";
import { smartToast } from "../../../API/toastManager";

const MEETING_POLL_INTERVAL_MS = 10000;
const IS_IN_MEETING_SYNC_INTERVAL_MS = 1000;

/**
 * Meeting state and actions for MainChat: has meeting for group, join handler, socket listener.
 */
export function useMainChatMeeting(api, groupId, groupInfo, meetingIdProp, socket) {
  const navigate = useNavigate();
  const [hasMeeting, setHasMeeting] = useState(false);
  const [activeMeetingIdForGroup, setActiveMeetingIdForGroup] = useState(null);
  const [isInMeeting, setIsInMeeting] = useState(false);

  // Check whether the group has a currently active meeting (and set state)
  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const checkMeetingExists = async () => {
      try {
        const candidateMeeting =
          groupInfo?.meeting || groupInfo?.group?.meeting || null;

        if (candidateMeeting && isMeetingCurrentlyActive(candidateMeeting)) {
          if (!cancelled) {
            setHasMeeting(true);
            setActiveMeetingIdForGroup(getMeetingId(candidateMeeting));
          }
          return;
        }

        if (!groupId) {
          if (!cancelled) {
            setHasMeeting(false);
            setActiveMeetingIdForGroup(null);
          }
          return;
        }

        const meetings = await getMeetingsByGroupId(api, groupId);
        if (!meetings?.length) {
          if (!cancelled) {
            setHasMeeting(false);
            setActiveMeetingIdForGroup(null);
          }
          return;
        }

        const active = meetings.find((m) => isMeetingCurrentlyActive(m));
        if (!cancelled) {
          setHasMeeting(!!active);
          setActiveMeetingIdForGroup(active ? getMeetingId(active) : null);
        }
      } catch (err) {
        if (!cancelled) setHasMeeting(false);
      }
    };

    checkMeetingExists();
    if (groupId) {
      intervalId = setInterval(checkMeetingExists, MEETING_POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [api, groupId, groupInfo]);

  // Socket: meeting ended for this group
  useEffect(() => {
    if (!socket || !groupId) return;

    const onMeetingEnded = (data) => {
      if (data?.groupId === groupId || !data?.groupId) {
        setHasMeeting(false);
        setActiveMeetingIdForGroup(null);
        setIsInMeeting(false);
      }
    };

    socket.on("meetingEnded", onMeetingEnded);
    return () => socket.off("meetingEnded", onMeetingEnded);
  }, [socket, groupId]);

  // Sync isInMeeting from sessionStorage (are we in this group's meeting?)
  useEffect(() => {
    const sync = () => {
      try {
        const stored = sessionStorage.getItem("activeMeetingId");
        const match =
          activeMeetingIdForGroup &&
          stored &&
          String(activeMeetingIdForGroup) === String(stored);
        setIsInMeeting(!!match);
      } catch {
        setIsInMeeting(false);
      }
    };
    sync();
    const interval = setInterval(sync, IS_IN_MEETING_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeMeetingIdForGroup]);

  const handleJoinMeeting = async (params) => {
    const {
      meetingId: paramMeetingId,
      searchParams,
      params: routeParams,
    } = params || {};

    try {
      let dynamicMeetingId =
        paramMeetingId ||
        meetingIdProp ||
        routeParams?.meetingId ||
        searchParams?.get?.("meetingId") ||
        groupInfo?.meeting?.id ||
        groupInfo?.meeting_id ||
        groupInfo?.meetingId ||
        groupInfo?.group?.meeting?.id ||
        groupInfo?.group?.meeting_id ||
        groupInfo?.group?.meetingId;

      if (!dynamicMeetingId && groupId) {
        const meetings = await getMeetingsByGroupId(api, groupId);
        if (meetings?.length > 0) {
          const activeMeeting =
            meetings.find((m) => isMeetingCurrentlyActive(m)) || meetings[0];
          dynamicMeetingId = getMeetingId(activeMeeting);
        }
      }

      if (!dynamicMeetingId) {
        smartToast.error(
          "No meeting available to join. Please wait for an administrator to create a meeting."
        );
        return;
      }

      if (String(dynamicMeetingId) === String(groupId)) {
        smartToast.error("Invalid meeting ID. Please contact your administrator.");
        return;
      }

      const meeting = await getMeetingById(api, dynamicMeetingId);
      if (!meeting) {
        smartToast.error("Meeting not found. It may have been deleted.");
        return;
      }

      if (!isMeetingCurrentlyActive(meeting)) {
        smartToast.error("This meeting is not currently active.");
        return;
      }

      await joinMeeting(api, dynamicMeetingId);
      smartToast.success("Successfully joined the meeting!");
      navigate("/meetings", { state: { meetingId: dynamicMeetingId, groupId } });
    } catch (error) {
      smartToast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to join meeting. Please try again."
      );
    }
  };

  return {
    hasMeeting,
    activeMeetingIdForGroup,
    isInMeeting,
    handleJoinMeeting,
  };
}
