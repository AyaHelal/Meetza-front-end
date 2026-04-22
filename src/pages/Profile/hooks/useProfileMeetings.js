import { useCallback, useEffect, useState } from "react";
import api from "../../../API/axiosInstance";
import { useSocket } from "../../../context/SocketContext";
import {
  buildMeetingsParams,
  filterMeetingsByDateRange,
  isMeetingLive,
} from "../../Calendar/utils/calendarUtils";

const CALENDAR_MEETINGS_PATH = (process.env.REACT_APP_CALENDAR_MEETINGS_ENDPOINT || "meeting").replace(
  /^\//,
  ""
);

function getMeetingStart(m) {
  const raw = m.start_time ?? m.startTime ?? m.start ?? m.scheduled_at ?? m.start_date;
  return raw ? new Date(raw) : null;
}

function getMeetingEnd(m, startFallback) {
  const raw = m.end_time ?? m.endTime ?? m.end ?? m.scheduled_end;
  if (raw) return new Date(raw);
  if (startFallback && !Number.isNaN(startFallback.getTime())) {
    return new Date(startFallback.getTime() + 60 * 60 * 1000);
  }
  return null;
}

function parseMeetingsPayload(root) {
  const raw = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
  return Array.isArray(raw) ? raw : [];
}

function mapToProfileRows(meetings) {
  return meetings
    .map((m) => {
      const startAt = getMeetingStart(m);
      const endAt = getMeetingEnd(m, startAt);
      const id = m.id ?? m.meeting_id ?? m.meetingId;
      if (id == null || id === "") return null;
      const groupId = m.group_id ?? m.groupId ?? m.group?.id ?? null;
      const titleRaw = m.title ?? m.meeting_title ?? m.name ?? m.subject ?? null;
      const title = titleRaw != null && String(titleRaw).trim() !== "" ? String(titleRaw).trim() : null;
      const fromGroup =
        m.group_name ??
        m.groupName ??
        m.course ??
        m.group?.name ??
        m.group_title ??
        (typeof m.group === "string" ? m.group : null);
      const groupName = fromGroup != null && String(fromGroup).trim() !== "" ? String(fromGroup).trim() : null;
      const meetingTitle = title || groupName || "Meeting";
      if (!startAt || Number.isNaN(startAt.getTime())) return null;
      return {
        id: String(id),
        groupId: groupId != null && String(groupId).trim() !== "" ? String(groupId) : null,
        meetingTitle,
        title,
        groupName,
        startAt,
        endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : new Date(startAt.getTime() + 60 * 60 * 1000),
        isLive: isMeetingLive(m),
        posterUrl: m.poster_url ?? m.posterUrl ?? m.poster ?? null,
      };
    })
    .filter(Boolean);
}

export default function useProfileMeetings() {
  const { socket } = useSocket();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const today = new Date();
    const rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 90);
    const rangeParams = buildMeetingsParams("range", today, rangeStart, rangeEnd);
    const startOfToday = rangeStart.getTime();

    const upcomingSorted = (list) => {
      const inWindow = filterMeetingsByDateRange(list, rangeStart, rangeEnd);
      const upcoming = inWindow.filter((m) => {
        const s = getMeetingStart(m);
        return s && !Number.isNaN(s.getTime()) && s.getTime() >= startOfToday;
      });
      upcoming.sort((a, b) => {
        const sa = getMeetingStart(a)?.getTime() ?? 0;
        const sb = getMeetingStart(b)?.getTime() ?? 0;
        return sa - sb;
      });
      return mapToProfileRows(upcoming);
    };

    try {
      let res;
      try {
        res = await api.get(`/${CALENDAR_MEETINGS_PATH}`, { params: rangeParams });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        try {
          res = await api.get("/meeting", { params: rangeParams });
        } catch (err2) {
          if (err2?.response?.status !== 404) throw err2;
          res = await api.get("/meeting");
        }
      }
      const list = parseMeetingsPayload(res?.data);
      setMeetings(upcomingSorted(list));
    } catch (err) {
      setError(err?.message || "Failed to load meetings");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!socket) return;
    const bump = () => refetch();
    const events = ["meetingCreated", "meetingUpdated", "meetingEnded", "meetingDeleted"];
    events.forEach((e) => socket.on?.(e, bump));
    return () => events.forEach((e) => socket.off?.(e, bump));
  }, [socket, refetch]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "calendarMeetingsUpdatedAt") refetch();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refetch]);

  return { meetings, loading, error, refetch };
}
