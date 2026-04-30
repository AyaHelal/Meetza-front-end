import { useState, useMemo, useEffect, useRef, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../context/SocketContext";
import { AuthContext } from "../../../context/AuthContext";
import { smartToast } from "../../../API/toastManager";

import {
  getWeekDates,
  getDatesInRange,
  buildMeetingsParams,
  buildWeekEvents,
  filterMeetingsByView,
  filterMeetingsByDateRange,
} from "../utils/calendarUtils";
import {
  getGroups,
  getMeetings,
  deleteMeeting as deleteMeetingService,
  joinMeeting as joinMeetingService,
} from "../services/calendarService";

export const VIEW_MODE = { DAY: "day", WEEK: "week", MONTH: "month", RANGE: "range" };

export function useCalendar() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState(VIEW_MODE.WEEK);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [weekEvents, setWeekEvents] = useState([]);
  const [monthMeetings, setMonthMeetings] = useState([]);
  const [groupsMap, setGroupsMap] = useState(() => ({}));
  const [groupsList, setGroupsList] = useState(() => []);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { socket } = useSocket();

  const isAdminRole = useMemo(() => {
    const role = (user?.role || "").toString().trim().toLowerCase();
    return role === "administrator" || role.includes("super_admin") || role.includes("super-admin");
  }, [user]);

  const dateBeforeSearchRef = useRef(null);
  const prevSearchQueryRef = useRef("");

  useEffect(() => {
    const hadSearch = prevSearchQueryRef.current.trim() !== "";
    const hasSearchNow = searchQuery.trim() !== "";
    if (!hadSearch && hasSearchNow) {
      dateBeforeSearchRef.current = currentDate;
    }
    if (hadSearch && !hasSearchNow) {
      setCurrentDate(dateBeforeSearchRef.current || new Date());
    }
    prevSearchQueryRef.current = searchQuery;
  }, [searchQuery, currentDate]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `calendar_groups_${user?.id || 'guest'}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { map, list } = JSON.parse(cached);
        setGroupsMap(map);
        setGroupsList(list);
      } catch (e) {
        console.error("Calendar groups cache parse error", e);
      }
    }
    getGroups(isAdminRole)
      .then(({ map, list }) => {
        if (cancelled) return;
        setGroupsMap(map);
        setGroupsList(list);
        localStorage.setItem(cacheKey, JSON.stringify({ map, list }));
      })
      .catch(() => {
        if (!cancelled && !cached) {
          setGroupsMap({});
          setGroupsList([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminRole, user?.id]);

  const getMeetingId = useCallback((m) => {
    if (!m) return null;
    return m.id ?? m.meeting_id ?? m.meetingId ?? null;
  }, []);

  const handleDeleteMeeting = async (meeting) => {
    if (!meeting || !isAdminRole) return;
    const meetingId = meeting.id || meeting.meeting_id;
    if (!meetingId) return;
    try {
      await deleteMeetingService(meetingId);
      smartToast.success("Meeting deleted successfully");
      window.dispatchEvent(new Event("calendarMeetingsUpdated"));
      try {
        localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
      } catch {}
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting meeting:", error);
      smartToast.error(error.response?.data?.message || "Failed to delete meeting");
    }
  };

  const handleJoinMeeting = useCallback(async (meeting) => {
    const id = getMeetingId(meeting);
    if (!id) return;
    try {
      await joinMeetingService(id);
      try {
        sessionStorage.setItem("activeMeetingId", String(id));
      } catch {}
      navigate("/meetings", { state: { meetingId: id } });
    } catch (err) {
      smartToast.error(err?.response?.data?.message || "Failed to join meeting");
    }
  }, [getMeetingId, navigate]);

  const weekDates = useMemo(() => {
    if (viewMode === VIEW_MODE.DAY) {
      const d = new Date(currentDate);
      d.setHours(0, 0, 0, 0);
      return [d];
    }
    if (viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd) {
      return getDatesInRange(rangeStart, rangeEnd);
    }
    return getWeekDates(currentDate);
  }, [currentDate, viewMode, rangeStart, rangeEnd]);

  useEffect(() => {
    const handleWindowCalendarUpdate = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener("calendarMeetingsUpdated", handleWindowCalendarUpdate);
    return () => window.removeEventListener("calendarMeetingsUpdated", handleWindowCalendarUpdate);
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "calendarMeetingsUpdatedAt") {
        setRefreshKey((prev) => prev + 1);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleMeetingsChanged = () => {
      setRefreshKey((prev) => prev + 1);
    };
    socket.on("meetingCreated", handleMeetingsChanged);
    socket.on("meetingUpdated", handleMeetingsChanged);
    socket.on("meetingEnded", handleMeetingsChanged);
    socket.on("meetingDeleted", handleMeetingsChanged);
    return () => {
      socket.off("meetingCreated", handleMeetingsChanged);
      socket.off("meetingUpdated", handleMeetingsChanged);
      socket.off("meetingEnded", handleMeetingsChanged);
      socket.off("meetingDeleted", handleMeetingsChanged);
    };
  }, [socket]);

  useEffect(() => {
    let cancelled = false;
    const getMeetingStartDate = (m) => {
      const raw = m.start_time ?? m.startTime ?? m.start ?? m.scheduled_at ?? m.start_date;
      return raw ? new Date(raw) : null;
    };
    const fetchMeetingsData = async () => {
      const hasSearch = !!searchQuery.trim();
      const hasGroupFilter = !!selectedGroupId;
      const isRange = viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd;
      const jumpToFirst = hasSearch || hasGroupFilter;
      const viewParams = buildMeetingsParams(viewMode, currentDate, rangeStart, rangeEnd);
      
      const cacheKey = `calendar_meetings_${viewMode}_${currentDate.toISOString().split('T')[0]}_${searchQuery.trim()}_${selectedGroupId || ''}_${rangeStart?.toISOString().split('T')[0] || ''}_${rangeEnd?.toISOString().split('T')[0] || ''}_${user?.id || 'guest'}`;
      let hasCache = false;

      const applyMeetings = (meetings, dateToShow) => {
        if (cancelled) return;
        const list = Array.isArray(meetings) ? meetings : [];
        const baseDate = dateToShow || currentDate;
        const firstStart = list.length > 0 ? getMeetingStartDate(list[0]) : null;
        const useFirstDate = jumpToFirst && firstStart;
        if (viewMode === VIEW_MODE.MONTH) {
          const forMonth = useFirstDate ? filterMeetingsByView(list, "month", firstStart) : list;
          setMonthMeetings(forMonth);
          setWeekEvents([]);
        } else {
          const wd = viewMode === VIEW_MODE.DAY
            ? (() => { const d = new Date(baseDate); d.setHours(0, 0, 0, 0); return [d]; })()
            : viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd
              ? getDatesInRange(rangeStart, rangeEnd)
              : getWeekDates(baseDate);
          const forView = viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd
            ? filterMeetingsByDateRange(list, rangeStart, rangeEnd)
            : useFirstDate ? filterMeetingsByView(list, viewMode, firstStart) : list;
          setWeekEvents(buildWeekEvents(forView, wd, groupsMap));
          setMonthMeetings([]);
        }
        if (jumpToFirst && list.length > 0 && firstStart) {
          const cur = new Date(currentDate);
          const sameDay = firstStart.getFullYear() === cur.getFullYear() && firstStart.getMonth() === cur.getMonth() && firstStart.getDate() === cur.getDate();
          if (!sameDay) setCurrentDate(firstStart);
        }
      };

      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const raw = JSON.parse(cachedData);
          const meetings = jumpToFirst && raw.length > 0
            ? [...raw].sort((a, b) => (getMeetingStartDate(a)?.getTime() ?? 0) - (getMeetingStartDate(b)?.getTime() ?? 0))
            : raw;
          applyMeetings(meetings, meetings.length > 0 ? getMeetingStartDate(meetings[0]) : undefined);
          setLoading(false);
          hasCache = true;
        } catch (e) {
          console.error("Calendar cache parse error", e);
        }
      }

      if (!hasCache) {
        setLoading(true);
        setError(null);
      }

      const params = jumpToFirst
        ? {
            ...(hasSearch ? { title: searchQuery.trim() } : {}),
            ...(hasGroupFilter ? { group_id: selectedGroupId } : {}),
            ...(isRange ? { start_date: viewParams.start_date, end_date: viewParams.end_date } : {}),
          }
        : { ...viewParams };

      try {
        const raw = await getMeetings(params);
        const meetings = jumpToFirst && raw.length > 0
          ? [...raw].sort((a, b) => (getMeetingStartDate(a)?.getTime() ?? 0) - (getMeetingStartDate(b)?.getTime() ?? 0))
          : raw;
        applyMeetings(meetings, meetings.length > 0 ? getMeetingStartDate(meetings[0]) : undefined);
        localStorage.setItem(cacheKey, JSON.stringify(raw));
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load meetings");
        setWeekEvents([]);
        setMonthMeetings([]);
      } finally {
        if (!cancelled && !hasCache) setLoading(false);
      }
    };
    fetchMeetingsData();
    return () => { cancelled = true; };
  }, [viewMode, currentDate, searchQuery, groupsMap, selectedGroupId, rangeStart, rangeEnd, refreshKey, user?.id]);

  const goPrev = () => {
    if (viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd) {
      const days = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
      setRangeStart(new Date(rangeStart.getTime() - days * 86400000));
      setRangeEnd(new Date(rangeEnd.getTime() - days * 86400000));
      return;
    }
    const d = new Date(currentDate);
    if (viewMode === VIEW_MODE.WEEK) d.setDate(d.getDate() - 7);
    else if (viewMode === VIEW_MODE.MONTH) d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goNext = () => {
    if (viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd) {
      const days = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
      setRangeStart(new Date(rangeStart.getTime() + days * 86400000));
      setRangeEnd(new Date(rangeEnd.getTime() + days * 86400000));
      return;
    }
    const d = new Date(currentDate);
    if (viewMode === VIEW_MODE.WEEK) d.setDate(d.getDate() + 7);
    else if (viewMode === VIEW_MODE.MONTH) d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleRangeChange = (start, end) => {
    setRangeStart(start);
    setRangeEnd(end);
    setViewMode(VIEW_MODE.RANGE);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode !== VIEW_MODE.RANGE) {
      setRangeStart(null);
      setRangeEnd(null);
    }
  };

  const filteredWeekEvents = useMemo(() => {
    if (!searchQuery) return weekEvents;
    const q = searchQuery.toLowerCase();
    return weekEvents.filter(ev =>
      ev.title?.toLowerCase().includes(q) ||
      ev.description?.toLowerCase().includes(q) ||
      ev.groupName?.toLowerCase().includes(q)
    );
  }, [weekEvents, searchQuery]);

  const filteredMonthMeetings = useMemo(() => {
    if (!searchQuery) return monthMeetings;
    const q = searchQuery.toLowerCase();
    return monthMeetings.filter(m =>
      m.title?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.group_name?.toLowerCase().includes(q) ||
      m.groupName?.toLowerCase().includes(q)
    );
  }, [monthMeetings, searchQuery]);

  const showWeekLikeGrid = viewMode === VIEW_MODE.DAY || viewMode === VIEW_MODE.WEEK || viewMode === VIEW_MODE.RANGE;

  return {
    viewMode,
    currentDate,
    setCurrentDate,
    searchQuery,
    setSearchQuery,
    groupsList,
    selectedGroupId,
    setSelectedGroupId,
    rangeStart,
    rangeEnd,
    loading,
    error,
    weekDates,
    filteredWeekEvents,
    filteredMonthMeetings,
    showWeekLikeGrid,
    isAdminRole,
    groupsMap,
    handleJoinMeeting,
    handleDeleteMeeting,
    goPrev,
    goNext,
    handleRangeChange,
    handleViewModeChange,
  };
}
