import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { smartToast } from "../../../API/toastManager";
import {
  emptyFormState,
  formatDate,
  formatForInput,
  getCurrentDateTimeLocal,
  getCurrentEndDateTimeLocal,
  getStoredRecordFlags,
  getTimeRange,
  isRecording,
  setStoredRecordFlag,
  STORAGE_KEY_RECORD_FLAGS,
} from "../utilis/adminMeetingRules";



import {
  fetchGroups as fetchGroupsService,
  fetchMeetings as fetchMeetingsService,
  createMeeting as createMeetingService,
  joinMeeting as joinMeetingService,
  updateRecurrence as updateRecurrenceService,
  deleteMeeting as deleteMeetingService,
  updateMeeting as updateMeetingService,
} from "../services/adminMeetingService";



import { useMediaQuery } from "./useMediaQuery";

export function useAdminMeetingPage() {
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState(() => {
    try {
      const cached = localStorage.getItem(`admin_meetings_${user?.id || 'guest'}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [groups, setGroups] = useState(() => {
    try {
      const cached = localStorage.getItem(`admin_groups_${user?.id || 'guest'}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(`admin_meetings_${user?.id || 'guest'}`);
    } catch {
      return true;
    }
  });
  const [groupsLoading, setGroupsLoading] = useState(() => {
    try {
      return !localStorage.getItem(`admin_groups_${user?.id || 'guest'}`);
    } catch {
      return true;
    }
  });
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [showDeleteMeetingModal, setShowDeleteMeetingModal] = useState(false);
  const [showWeeklyDeleteModal, setShowWeeklyDeleteModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [weeklyDropdownOpen, setWeeklyDropdownOpen] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isMobileTablet = useMediaQuery("(max-width: 1024px)");

  const [formData, setFormData] = useState(() => emptyFormState());

  useEffect(() => {
    if (!isMobileTablet || !showCreateMeetingModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileTablet, showCreateMeetingModal]);

  // Same visibility as Groups page: GET /group + groupIsManagedByUser (includes group_admin / admins[])
  const fetchGroups = useCallback(async () => {
    const cacheKey = `admin_groups_${user?.id || 'guest'}`;
    const hasCache = !!localStorage.getItem(cacheKey);
    try {
      if (!hasCache) setGroupsLoading(true);
      const mapped = await fetchGroupsService(user);
      setGroups(mapped);
      localStorage.setItem(cacheKey, JSON.stringify(mapped));
    } catch (error) {
      console.error("Error fetching groups:", error);
      if (!hasCache) smartToast.error("Failed to load groups");
    } finally {
      if (!hasCache) setGroupsLoading(false);
    }
  }, [user]);


  // GET /meeting with token – backend returns only this admin's meetings for Administrator role
  const fetchMeetings = async (options) => {
    const cacheKey = `admin_meetings_${user?.id || 'guest'}`;
    const isSilent = options?.silent === true;
    const hasCache = !!localStorage.getItem(cacheKey) && !options?.query;
    try {
      if (!hasCache && !isSilent) setLoading(true);
      const meetingsList = await fetchMeetingsService(user, options);
      setMeetings(meetingsList);
      localStorage.setItem(cacheKey, JSON.stringify(meetingsList));
    } catch (error) {
      console.error("Error fetching meetings:", error);
      if (!hasCache && !isSilent) smartToast.error("Failed to load meetings");
    } finally {
      if (!hasCache && !isSilent) setLoading(false);
    }
  };


  useEffect(() => {
    fetchMeetings();
  }, [user?.id]);

  // Socket listeners for real-time updates (Created/Updated/Deleted/Ended)
  useEffect(() => {
    if (!socket) return;

    const onMeetingListChange = () => {
      fetchMeetings({ query: searchTerm, silent: true });
    };

    socket.on("meetingCreated", onMeetingListChange);
    socket.on("meetingUpdated", onMeetingListChange);
    socket.on("meetingEnded", onMeetingListChange);
    socket.on("meetingDeleted", onMeetingListChange);

    return () => {
      socket.off("meetingCreated", onMeetingListChange);
      socket.off("meetingUpdated", onMeetingListChange);
      socket.off("meetingEnded", onMeetingListChange);
      socket.off("meetingDeleted", onMeetingListChange);
    };
  }, [socket, searchTerm]);

  const [, setTick] = useState(0);
  // Precision timers for time-based Join button visibility
  useEffect(() => {
    if (!meetings?.length) return;

    const now = Date.now();
    const timers = [];

    meetings.forEach((m) => {
      const startTime = m.start_time ? new Date(m.start_time).getTime() : null;
      const endTime = m.end_time ? new Date(m.end_time).getTime() : null;

      // Timer to show Join button
      if (startTime && startTime > now) {
        const delay = startTime - now;
        // Max delay for setTimeout is ~24 days, but usually meetings are much sooner
        if (delay < 2147483647) {
          timers.push(setTimeout(() => setTick((t) => t + 1), delay + 100));
        }
      }

      // Timer to hide Join button (Ended status)
      if (endTime && endTime > now) {
        const delay = endTime - now;
        if (delay < 2147483647) {
          timers.push(setTimeout(() => setTick((t) => t + 1), delay + 100));
        }
      }
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, [meetings]);

  useEffect(() => {
    if (searchTerm === "") {
      // fetchMeetings(); // Already handled by initial load or clearing
      // But if it was cleared, we need to refresh
    }
    const timer = setTimeout(() => {
      fetchMeetings({ query: searchTerm });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "poster_file") {
      setFormData((prev) => ({ ...prev, poster_file: files?.[0] || null }));
    } else if (name === "files") {
      const newFiles = files ? Array.from(files) : [];
      setFormData((prev) => ({ ...prev, files: [...(prev.files || []), ...newFiles] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetFormForCreate = useCallback(() => {
    setEditingMeetingId(null);
    setFormData(emptyFormState());
    setShowCreateMeetingModal(false);
  }, []);

  const openCreateMeetingModal = useCallback(() => {
    setEditingMeetingId(null);
    setFormData(emptyFormState());
    setShowCreateMeetingModal(true);
  }, []);

  const closeCreateMeetingModal = useCallback(() => {
    setShowCreateMeetingModal(false);
  }, []);

  // Create meeting – same API as meetza-admin (POST /meeting with FormData)
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!formData.group_id) {
      smartToast.error("Please select a group");
      return;
    }
    if (!editingMeetingId && !formData.poster_file) {
      smartToast.error("Poster image is required");
      return;
    }
    try {
      const { createdMeeting, recordValue } = await createMeetingService(formData);

      smartToast.success("Meeting created successfully!");
      resetFormForCreate();
      fetchMeetings(createdMeeting?.id ? { patchRecordMeeting: { id: createdMeeting.id, value: recordValue } } : undefined);
      // Notify Calendar page(s) to refetch meetings (update calendar cards)
      window.dispatchEvent(new Event("calendarMeetingsUpdated"));
      try {
        localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
      } catch { }
    } catch (error) {
      console.error("Error creating meeting:", error);
      smartToast.error(error.response?.data?.message || "Failed to create meeting");
    }
  };


  const handleJoinMeeting = async (meetingId) => {
    if (!meetingId) return;
    try {
      await joinMeetingService(meetingId);
      try {
        sessionStorage.setItem("activeMeetingId", String(meetingId));
      } catch {
        /* ignore */
      }
      navigate("/meetings", { state: { meetingId } });
    } catch (err) {
      smartToast.error(err.response?.data?.message || "Failed to join meeting");
    }
  };


  const handleWeeklyStatusChange = async (meetingId, newStatus) => {
    if (!meetingId) return;
    try {
      await updateRecurrenceService(meetingId, newStatus);
      smartToast.success(`Weekly recurrence ${newStatus === "active" ? "activated" : "deactivated"} successfully`);

      // Refresh meetings to show updated status
      fetchMeetings();
      window.dispatchEvent(new Event("calendarMeetingsUpdated"));
      try {
        localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
      } catch { }
    } catch (err) {
      smartToast.error(err.response?.data?.message || `Failed to ${newStatus} weekly recurrence`);
    }
    setWeeklyDropdownOpen(null);
  };


  const handleDeleteMeetingClick = (meeting) => {
    if (!meeting) return;
    const meetingId = meeting.id || meeting.meeting_id;
    setMeetingToDelete({ ...meeting, meetingId });

    // Show weekly delete modal if meeting is weekly active, otherwise show regular delete modal
    if (meeting.is_weekly === 1) {
      setShowWeeklyDeleteModal(true);
    } else {
      setShowDeleteMeetingModal(true);
    }
  };

  const confirmDeleteMeeting = async (deleteAllWeeks = false) => {
    if (!meetingToDelete) return;
    setDeletingMeeting(true);
    try {
      const meetingId = meetingToDelete.meetingId || meetingToDelete.id || meetingToDelete.meeting_id;

      const res = await deleteMeetingService(meetingId, deleteAllWeeks);

      if (res.data?.success !== false) {
        setMeetings((prev) => prev.filter((m) => (m.id || m.meeting_id) !== meetingId));
        smartToast.success(deleteAllWeeks ? "All weekly meetings deleted successfully" : "Meeting deleted successfully");
        const flags = getStoredRecordFlags();
        delete flags[meetingId];
        localStorage.setItem(STORAGE_KEY_RECORD_FLAGS, JSON.stringify(flags));
        setShowDeleteMeetingModal(false);
        setShowWeeklyDeleteModal(false);
        setMeetingToDelete(null);
        window.dispatchEvent(new Event("calendarMeetingsUpdated"));
        try {
          localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
        } catch { }
      } else {
        smartToast.error(res.data?.message || "Failed to delete meeting");
        setShowDeleteMeetingModal(false);
        setShowWeeklyDeleteModal(false);
        setMeetingToDelete(null);
      }
    } catch (err) {
      smartToast.error(err.response?.data?.message || "Error deleting meeting");
      setShowDeleteMeetingModal(false);
      setShowWeeklyDeleteModal(false);
      setMeetingToDelete(null);
    } finally {
      setDeletingMeeting(false);
    }
  };


  const closeDeleteMeetingModal = () => {
    if (deletingMeeting) return;
    setShowDeleteMeetingModal(false);
    setMeetingToDelete(null);
  };

  const closeWeeklyDeleteModal = () => {
    if (deletingMeeting) return;
    setShowWeeklyDeleteModal(false);
    setMeetingToDelete(null);
  };

  const handleEditMeeting = (meeting) => {
    const id = meeting.id || meeting.meeting_id;
    setEditingMeetingId(id);
    setFormData({
      title: meeting.title || "",
      startTime: formatForInput(meeting.start_time) || getCurrentDateTimeLocal(),
      endTime: formatForInput(meeting.end_time) || getCurrentEndDateTimeLocal(),
      status: meeting.status || "Scheduled",
      group_id: meeting.group_id || "",
      description: meeting.description || "",
      recordMeeting: isRecording(meeting.record_meeting) ? "Recording" : "Not Recording",
      weeklyOption: meeting.is_weekly === 1 ? "Active" : meeting.is_weekly === 0 ? "Inactive" : "Active",
      poster_file: null,
      files: [],
    });
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1024px)").matches) {
      setShowCreateMeetingModal(true);
    }
  };

  const handleUpdateMeeting = async (e) => {
    e.preventDefault();
    if (!editingMeetingId) return;
    if (!formData.group_id) {
      smartToast.error("Please select a group");
      return;
    }
    const originalMeeting = meetings.find((m) => (m.id || m.meeting_id) === editingMeetingId);
    if (!originalMeeting) return;
    try {
      const res = await updateMeetingService(editingMeetingId, formData, originalMeeting);
      if (res.data?.success) {
        smartToast.success("Meeting updated successfully");
        setStoredRecordFlag(editingMeetingId, formData.recordMeeting === "Recording" ? 1 : 0);
        resetFormForCreate();
        fetchMeetings();
        window.dispatchEvent(new Event("calendarMeetingsUpdated"));
        try {
          localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
        } catch { }
      } else {
        smartToast.error(res.data?.message || "Failed to update meeting");
      }
    } catch (err) {
      smartToast.error(err.response?.data?.message || "Error updating meeting");
    }
  };


  const handleFormSubmit = (e) => {
    if (editingMeetingId) handleUpdateMeeting(e);
    else handleCreateMeeting(e);
  };

  /** True if meeting end_time has passed (meeting is over). */
  const isMeetingEnded = (meeting) => {
    const endTime = meeting?.end_time;
    if (!endTime) return false;
    return new Date() > new Date(endTime);
  };

  /** True if start_time is still in the future — Join is hidden until the meeting begins. */
  const isMeetingNotStartedYet = (meeting) => {
    const startTime = meeting?.start_time;
    if (!startTime) return false;
    return Date.now() < new Date(startTime).getTime();
  };

  return {
    meetings,
    loading,
    groups,
    groupsLoading,
    editingMeetingId,
    showDeleteMeetingModal,
    showWeeklyDeleteModal,
    meetingToDelete,
    deletingMeeting,
    showCreateMeetingModal,
    weeklyDropdownOpen,
    setWeeklyDropdownOpen,
    isMobileTablet,
    formData,
    handleInputChange,
    resetFormForCreate,
    openCreateMeetingModal,
    closeCreateMeetingModal,
    handleFormSubmit,
    handleJoinMeeting,
    handleWeeklyStatusChange,
    handleDeleteMeetingClick,
    confirmDeleteMeeting,
    closeDeleteMeetingModal,
    closeWeeklyDeleteModal,
    handleEditMeeting,
    isRecording,
    formatDate,
    getTimeRange,
    isMeetingEnded,
    isMeetingNotStartedYet,
    searchTerm,
    setSearchTerm,
  };
}
