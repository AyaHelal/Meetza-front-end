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
    if (selfMemberId == null || !meetingInfo) return false;
    const sid = String(selfMemberId);
    if (meetingInfo.administrator_id != null && String(meetingInfo.administrator_id) === sid) {
      return true;
    }
    const admins = meetingInfo.admins;
    if (!Array.isArray(admins) || admins.length === 0) return false;
    return admins.some((row) => {
      const uid = row?.group_admin_id ?? row?.user_id ?? row?.userId;
      return uid != null && String(uid) === sid;
    });
  }, [meetingInfo, selfMemberId]);

  return { meetingInfo, isMeetingAdmin };
}
