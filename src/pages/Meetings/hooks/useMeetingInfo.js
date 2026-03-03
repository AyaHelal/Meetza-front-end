import { useEffect, useState, useMemo } from "react";
import * as meetingService from "../services/meetingService";
import api from "../../../API/axiosInstance";

/**
 * Fetches meeting info and computes isMeetingAdmin.
 * @param {string} meetingId
 * @param {string | number | null} selfMemberId - current user id
 * @returns {{ meetingInfo: object | null, isMeetingAdmin: boolean }}
 */
export function useMeetingInfo(meetingId, selfMemberId) {
  const [meetingInfo, setMeetingInfo] = useState(null);

  useEffect(() => {
    if (!meetingId) {
      setMeetingInfo(null);
      return;
    }
    let cancelled = false;
    meetingService.getMeetingInfo(api, meetingId).then((info) => {
      if (!cancelled) setMeetingInfo(info);
    });
    return () => { cancelled = true; };
  }, [meetingId]);

  const isMeetingAdmin = useMemo(() => {
    if (!meetingInfo?.administrator_id || selfMemberId == null) return false;
    return String(meetingInfo.administrator_id) === String(selfMemberId);
  }, [meetingInfo?.administrator_id, selfMemberId]);

  return { meetingInfo, isMeetingAdmin };
}
