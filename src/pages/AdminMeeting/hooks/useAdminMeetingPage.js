import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../API/axiosInstance";
import { smartToast } from "../../../API/toastManager";
import { dedupeById } from "../../../utils/dedupeById";
import { groupIsManagedByUser } from "../../Groups/services/groupsService";
import {
  emptyFormState,
  formatDate,
  formatForAPI,
  formatForInput,
  getCurrentDateTimeLocal,
  getCurrentEndDateTimeLocal,
  getStoredRecordFlags,
  getTimeRange,
  isRecording,
  setStoredRecordFlag,
  STORAGE_KEY_RECORD_FLAGS,
  userIsMeetingAdmin,
} from "../services/adminMeetingService";
import { useMediaQuery } from "./useMediaQuery";

export function useAdminMeetingPage() {
  const { user } = useContext(AuthContext);
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
      const res = await api.get("/group");
      const payload = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");
      const roleNorm = String(currentUser?.role || "").trim();
      const isSuperAdmin = roleNorm === "Super_Admin";
      const isAdministrator = roleNorm === "Administrator" || roleNorm.toLowerCase() === "administrator";
      let list = dedupeById(payload);
      if (isAdministrator && !isSuperAdmin && currentUser?.id != null) {
        list = list.filter((g) => groupIsManagedByUser(g, currentUser.id));
      }
      const mapped = list.map((g) => ({ id: g.id, name: g.name || g.group_name }));
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
    const hasCache = !!localStorage.getItem(cacheKey);
    try {
      if (!hasCache) setLoading(true);
      const response = await api.get("/meeting");
      const data = response?.data;
      let meetingsList = [];
      if (data?.success && Array.isArray(data?.data)) {
        meetingsList = data.data;
      } else if (Array.isArray(data?.data)) {
        meetingsList = data.data;
      } else if (Array.isArray(data)) {
        meetingsList = data;
      }
      // Client-side filter: Administrator sees meetings they co-admin (admins[] / group_admin_id), not only legacy administrator_id
      const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");
      const roleNorm = String(currentUser?.role || "").trim();
      const isSuperAdmin = roleNorm === "Super_Admin";
      const isAdministrator = roleNorm === "Administrator" || roleNorm.toLowerCase() === "administrator";
      if ((isAdministrator || isSuperAdmin) && currentUser?.id != null && String(currentUser.id) !== "") {
        if (!isSuperAdmin) {
          meetingsList = meetingsList.filter((m) => userIsMeetingAdmin(m, currentUser.id));
        }
      }
      const patch = options?.patchRecordMeeting;
      if (patch?.id != null) {
        meetingsList = meetingsList.map((m) =>
          m.id === patch.id || m.meeting_id === patch.id ? { ...m, record_meeting: patch.value } : m
        );
      }
      const storedFlags = getStoredRecordFlags();
      meetingsList = meetingsList.map((m) => {
        const id = m.id || m.meeting_id;
        const stored = id != null ? storedFlags[id] : undefined;
        const recordMeeting = m.record_meeting !== undefined && m.record_meeting !== null ? m.record_meeting : stored;
        return { ...m, record_meeting: recordMeeting };
      });
      setMeetings(meetingsList);
      localStorage.setItem(cacheKey, JSON.stringify(meetingsList));
    } catch (error) {
      console.error("Error fetching meetings:", error);
      if (!hasCache) smartToast.error("Failed to load meetings");
    } finally {
      if (!hasCache) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [user?.id]);

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
      const form = new FormData();
      form.append("title", formData.title);
      form.append("start_time", formatForAPI(formData.startTime));
      form.append("end_time", formatForAPI(formData.endTime));
      form.append("group_id", formData.group_id);
      form.append("status", formData.status);
      form.append("recording", formData.recordMeeting === "Recording" ? "1" : "0");
      form.append("weekly", formData.weeklyOption === "Active" ? "1" : formData.weeklyOption === "Inactive" ? "0" : "");

      if (formData.description) form.append("description", formData.description);
      form.append("poster_file", formData.poster_file);
      if (Array.isArray(formData.files)) {
        formData.files.forEach((file) => {
          if (file instanceof File) form.append("files", file);
        });
      }

      const res = await api.post("/meeting", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const createdMeeting = res.data?.data;
      const recordValue = formData.recordMeeting === "Recording" ? 1 : 0;
      if (createdMeeting?.id) setStoredRecordFlag(createdMeeting.id, recordValue);

      smartToast.success("Meeting created successfully!");
      resetFormForCreate();
      fetchMeetings(createdMeeting?.id ? { patchRecordMeeting: { id: createdMeeting.id, value: recordValue } } : undefined);
      // Notify Calendar page(s) to refetch meetings (update calendar cards)
      window.dispatchEvent(new Event("calendarMeetingsUpdated"));
      try {
        localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
      } catch {}
    } catch (error) {
      console.error("Error creating meeting:", error);
      smartToast.error(error.response?.data?.message || "Failed to create meeting");
    }
  };

  const handleJoinMeeting = async (meetingId) => {
    if (!meetingId) return;
    try {
      await api.post(`/meeting/${meetingId}/join`);
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
      if (newStatus === "active") {
        // Use POST for activate recurrence
        await api.post(`/meeting/${meetingId}/activate-recurrence`);
        smartToast.success("Weekly recurrence activated successfully");
      } else {
        // Use PATCH for deactivate recurrence
        await api.patch(`/meeting/${meetingId}/deactivate-recurrence`);
        smartToast.success("Weekly recurrence deactivated successfully");
      }

      // Refresh meetings to show updated status
      fetchMeetings();
      window.dispatchEvent(new Event("calendarMeetingsUpdated"));
      try {
        localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
      } catch {}
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
      const isWeeklyActive = meetingToDelete.is_weekly === 1;

      let res;
      if (isWeeklyActive && deleteAllWeeks) {
        // Delete all weekly meetings (series)
        res = await api.delete(`/meeting/${meetingId}`, { params: { scope: "series" } });
      } else {
        // Regular delete for this week only
        res = await api.delete(`/meeting/${meetingId}`);
      }

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
        } catch {}
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
      const hasPoster = formData.poster_file instanceof File;
      const hasDescription = formData.description != null;
      if (hasPoster || hasDescription) {
        const form = new FormData();
        form.append("title", formData.title);
        form.append("start_time", formatForAPI(formData.startTime));
        form.append("end_time", formatForAPI(formData.endTime));
        form.append("status", formData.status);
        form.append("group_id", formData.group_id || originalMeeting.group_id);
        form.append("recording", formData.recordMeeting === "Recording" ? "1" : "0");
        form.append("weekly", formData.weeklyOption === "Active" ? "1" : formData.weeklyOption === "Inactive" ? "0" : "");
        if (formData.description != null) form.append("description", formData.description);
        if (hasPoster) form.append("poster_file", formData.poster_file);
        const res = await api.put(`/meeting/${editingMeetingId}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.success) {
          smartToast.success("Meeting updated successfully");
          setStoredRecordFlag(editingMeetingId, formData.recordMeeting === "Recording" ? 1 : 0);
          resetFormForCreate();
          fetchMeetings();
          window.dispatchEvent(new Event("calendarMeetingsUpdated"));
          try {
            localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
          } catch {}
        } else smartToast.error(res.data?.message || "Failed to update meeting");
      } else {
        const payload = {
          title: formData.title,
          start_time: formatForAPI(formData.startTime),
          end_time: formatForAPI(formData.endTime),
          status: formData.status,
          group_id: formData.group_id || originalMeeting.group_id,
          recording: formData.recordMeeting === "Recording" ? "1" : "0",
          weekly: formData.weeklyOption === "Active" ? "1" : formData.weeklyOption === "Inactive" ? "0" : "",
        };
        const res = await api.put(`/meeting/${editingMeetingId}`, payload);
        if (res.data?.success) {
          smartToast.success("Meeting updated successfully");
          setStoredRecordFlag(editingMeetingId, formData.recordMeeting === "Recording" ? 1 : 0);
          resetFormForCreate();
          fetchMeetings();
          window.dispatchEvent(new Event("calendarMeetingsUpdated"));
          try {
            localStorage.setItem("calendarMeetingsUpdatedAt", String(Date.now()));
          } catch {}
        } else smartToast.error(res.data?.message || "Failed to update meeting");
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
  };
}
