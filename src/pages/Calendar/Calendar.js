import React, { useState, useMemo, useEffect, useRef, useContext, useCallback } from "react";
import api from "../../API/axiosInstance";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { AuthContext } from "../../context/AuthContext";
import { smartToast } from "../../API/toastManager";
import CalendarHeader from "./components/CalendarHeader";
import CalendarToolbar from "./components/CalendarToolbar";
import CalendarNav from "./components/CalendarNav";
import CalendarWeekGrid from "./components/CalendarWeekGrid";
import CalendarMonthGrid from "./components/CalendarMonthGrid";
import {
  getWeekDates,
  getDatesInRange,
  buildMeetingsParams,
  buildWeekEvents,
  filterMeetingsByView,
  filterMeetingsByDateRange,
  isMeetingLive,
} from "./utils/calendarUtils";
import "./Calendar.css";

const VIEW_MODE = { DAY: "day", WEEK: "week", MONTH: "month", RANGE: "range" };

// Backend may expose GET /meetings (filtered) or only GET /meeting (list). Try both.
const CALENDAR_MEETINGS_PATH =
  (process.env.REACT_APP_CALENDAR_MEETINGS_ENDPOINT || "meeting").replace(/^\//, "");

export default function Calendar() {
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
  // Trigger refetch when meetings change via sockets (create/update/delete/end) without full page reload
  const [refreshKey, setRefreshKey] = useState(0);
  const { socket } = useSocket();


  const isAdminRole = useMemo(() => {
    const role = (user?.role || "").toString().trim().toLowerCase();
    return role === "administrator" || role.includes("super_admin") || role.includes("super-admin");
  }, [user]);

  // When user clears search, restore the date they were viewing before they searched.
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
  }, [searchQuery]);

  // Fetch groups for filter
  useEffect(() => {
    let cancelled = false;

    const userRole = (user?.role || "").toString().trim().toLowerCase();
    const endpoint = isAdminRole ? "/group" : "/chat/groups";

    api
      .get(endpoint)
      .then((response) => {
        if (cancelled) return;
        const raw = response?.data?.data ?? response?.data;
        const payload = Array.isArray(raw) ? raw : [];
        const map = {};
        const list = [];
        payload.forEach((g) => {
          const id = g.id ?? g.group_id ?? g._id;
          const name = g.name ?? g.group_name ?? g.title ?? g.content_name ?? g.group_content_name ?? "";
          if (id != null && id !== "") {
            const idStr = String(id);
            const nameStr = name && String(name).trim() ? String(name).trim() : "—";
            map[idStr] = nameStr;
            list.push({ id: idStr, name: nameStr });
          }
        });
        setGroupsMap(map);
        setGroupsList(list);
      })
      .catch(() => {
        if (!cancelled) {
          setGroupsMap({});
          setGroupsList([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);


  const getMeetingId = useCallback((m) => {
    if (!m) return null;
    return m.id ?? m.meeting_id ?? m.meetingId ?? null;
  }, []);


  const handleDeleteMeeting = async (meeting) => {
    if (!meeting || !isAdminRole) return;
    
    const meetingId = meeting.id || meeting.meeting_id;
    if (!meetingId) return;
    
    try {
      await api.delete(`/meeting/${meetingId}`);
      smartToast.success("Meeting deleted successfully");
      
      // Notify AdminMeetingPage and other calendar instances to refresh
      window.dispatchEvent(new Event("calendarMeetingsUpdated"));
      try {
        localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
      } catch {}
      
      // Refresh calendar data
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
      await api.post(`/meeting/${id}/join`);
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

  // Also listen to a global browser event dispatched from AdminMeetingPage after create/update/delete
  useEffect(() => {
    const handleWindowCalendarUpdate = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener("calendarMeetingsUpdated", handleWindowCalendarUpdate);
    return () => window.removeEventListener("calendarMeetingsUpdated", handleWindowCalendarUpdate);
  }, []);

  // Cross-tab sync: when Admin page in another tab updates meetings, listen to storage changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "calendarMeetingsUpdatedAt") {
        setRefreshKey((prev) => prev + 1);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // When backend broadcasts that meetings changed, softly refetch calendar data
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
    const fetchMeetings = async () => {
      setLoading(true);
      setError(null);
      const hasSearch = !!searchQuery.trim();
      const hasGroupFilter = !!selectedGroupId;
      const isRange = viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd;
      const jumpToFirst = hasSearch || hasGroupFilter;
      const viewParams = buildMeetingsParams(viewMode, currentDate, rangeStart, rangeEnd);
      const params = jumpToFirst
        ? {
            ...(hasSearch ? { title: searchQuery.trim() } : {}),
            ...(hasGroupFilter ? { group_id: selectedGroupId } : {}),
            ...(isRange ? { start_date: viewParams.start_date, end_date: viewParams.end_date } : {}),
          }
        : { ...viewParams };
      const applyMeetings = (meetings, dateToShow) => {
        if (cancelled) return;
        const list = Array.isArray(meetings) ? meetings : [];
        const baseDate = dateToShow || currentDate;
        const firstStart = list.length > 0 ? getMeetingStartDate(list[0]) : null;
        const useFirstDate = jumpToFirst && firstStart;
        if (viewMode === VIEW_MODE.MONTH) {
          const forMonth = useFirstDate
            ? filterMeetingsByView(list, "month", firstStart)
            : list;
          setMonthMeetings(forMonth);
          setWeekEvents([]);
        } else {
          const wd =
            viewMode === VIEW_MODE.DAY
              ? (() => {
                const d = new Date(baseDate);
                d.setHours(0, 0, 0, 0);
                return [d];
              })()
              : viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd
                ? getDatesInRange(rangeStart, rangeEnd)
                : getWeekDates(baseDate);
          const forView =
            viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd
              ? filterMeetingsByDateRange(list, rangeStart, rangeEnd)
              : useFirstDate
                ? filterMeetingsByView(list, viewMode, firstStart)
                : list;
          setWeekEvents(buildWeekEvents(forView, wd, groupsMap));
          setMonthMeetings([]);
        }
        if (jumpToFirst && list.length > 0 && firstStart) {
          const cur = new Date(currentDate);
          const sameDay =
            firstStart.getFullYear() === cur.getFullYear() &&
            firstStart.getMonth() === cur.getMonth() &&
            firstStart.getDate() === cur.getDate();
          if (!sameDay) setCurrentDate(firstStart);
        }
      };
      try {
        const res = await api.get(`/${CALENDAR_MEETINGS_PATH}`, { params });
        const root = res?.data;
        const raw = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
        const meetings = jumpToFirst && raw.length > 0
          ? [...raw].sort((a, b) => {
            const sa = getMeetingStartDate(a)?.getTime() ?? 0;
            const sb = getMeetingStartDate(b)?.getTime() ?? 0;
            return sa - sb;
          })
          : raw;
        const firstStart = meetings.length > 0 ? getMeetingStartDate(meetings[0]) : null;
        applyMeetings(meetings, firstStart || undefined);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 404 && (params.title || Object.keys(params).length > 0)) {
          try {
            const fallbackParams = {
              ...(hasSearch ? { title: searchQuery.trim() } : {}),
              ...(selectedGroupId ? { group_id: selectedGroupId } : {}),
              ...(isRange && rangeStart && rangeEnd
                ? (() => {
                    const rp = buildMeetingsParams(viewMode, currentDate, rangeStart, rangeEnd);
                    return { start_date: rp.start_date, end_date: rp.end_date };
                  })()
                : {}),
            };
            const fallback = await api.get(`/meeting`, { params: fallbackParams });
            const root = fallback?.data;
            const all = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
            const sorted = [...all].sort((a, b) => {
              const sa = getMeetingStartDate(a)?.getTime() ?? 0;
              const sb = getMeetingStartDate(b)?.getTime() ?? 0;
              return sa - sb;
            });
            const firstStart = sorted.length > 0 ? getMeetingStartDate(sorted[0]) : null;
            let forView;
            if (isRange && rangeStart && rangeEnd) {
              forView = filterMeetingsByDateRange(jumpToFirst ? sorted : all, rangeStart, rangeEnd);
            } else if (jumpToFirst && firstStart) {
              forView = filterMeetingsByView(sorted, viewMode, firstStart);
            } else if (hasSearch) {
              forView = sorted;
            } else {
              forView = filterMeetingsByView(all, viewMode, currentDate);
            }
            applyMeetings(forView, firstStart || undefined);
            setError(null);
          } catch (e) {
            setError("Calendar: meetings endpoint not available. Add GET /meeting with ?day, ?week, or ?month.");
            setWeekEvents([]);
            setMonthMeetings([]);
          }
        } else {
          setError(err?.message || "Failed to load meetings");
          setWeekEvents([]);
          setMonthMeetings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMeetings();
    return () => {
      cancelled = true;
    };
  }, [viewMode, currentDate, searchQuery, groupsMap, selectedGroupId, rangeStart, rangeEnd, refreshKey]);

  const goPrev = () => {
    if (viewMode === VIEW_MODE.RANGE && rangeStart && rangeEnd) {
      const days =
        Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
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
      const days =
        Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
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
    return weekEvents.filter(
      (ev) =>
        ev.title?.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q) ||
        ev.groupName?.toLowerCase().includes(q)
    );
  }, [weekEvents, searchQuery]);

  const filteredMonthMeetings = useMemo(() => {
    if (!searchQuery) return monthMeetings;
    const q = searchQuery.toLowerCase();
    return monthMeetings.filter(
      (m) =>
        m.title?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.group_name?.toLowerCase().includes(q) ||
        m.groupName?.toLowerCase().includes(q)
    );
  }, [monthMeetings, searchQuery]);

  const showWeekLikeGrid =
    viewMode === VIEW_MODE.DAY || viewMode === VIEW_MODE.WEEK || viewMode === VIEW_MODE.RANGE;

  return (
    <div className="calendar-page">
      <div className="calendar-toolbar-card">
        <CalendarHeader />
      <CalendarToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
          groupsList={groupsList}
          selectedGroupId={selectedGroupId}
          onGroupChange={setSelectedGroupId}
      />
      <CalendarNav
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          weekDates={weekDates}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={handleRangeChange}
        />
      </div>
      {error && <div className="calendar-error">{error}</div>}
      {loading ? (
        <div className="calendar-loading">Loading meetings…</div>
      ) : showWeekLikeGrid ? (
        <CalendarWeekGrid
          events={filteredWeekEvents}
          weekDates={weekDates}
          onPrev={goPrev}
          onNext={goNext}
          onJoinMeeting={handleJoinMeeting}
          onDeleteMeeting={handleDeleteMeeting}
          isAdminRole={isAdminRole}
        />
      ) : (
        <CalendarMonthGrid
          currentDate={currentDate}
          meetings={filteredMonthMeetings}
          groupsMap={groupsMap}
          onJoinMeeting={handleJoinMeeting}
          onDeleteMeeting={handleDeleteMeeting}
          isAdminRole={isAdminRole}
        />
      )}
    </div>
  );
}
