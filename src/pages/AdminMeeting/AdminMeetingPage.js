import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../API/axiosInstance";
import { smartToast } from "../../API/toastManager";
import "./AdminMeetingPage.css";
import {
  VideoCamera,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PencilSimple,
  Trash,
  CalendarPlusIcon,
  CalendarXIcon,
  CaretDown
} from "@phosphor-icons/react";
import { ConfirmDeleteModal } from "../../components/shared/ConfirmDeleteModal";

const getCurrentDateTimeLocal = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const getCurrentEndDateTimeLocal = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Format datetime for API (same as meetza-admin): "YYYY-MM-DD HH:mm:00"
const formatForAPI = (inputValue) => {
    if (!inputValue) return "";
    const d = new Date(inputValue);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

// لتعبئة datetime-local من الـ API (Edit)
const formatForInput = (value) => {
    if (!value) return "";
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isRecording = (value) =>
    value === true || value === 1 || value === "1";

const STORAGE_KEY_RECORD_FLAGS = "meetza_admin_meeting_record_flags";

const getStoredRecordFlags = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_RECORD_FLAGS);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const setStoredRecordFlag = (meetingId, value) => {
    const flags = getStoredRecordFlags();
    flags[meetingId] = value;
    localStorage.setItem(STORAGE_KEY_RECORD_FLAGS, JSON.stringify(flags));
};

function useMediaQuery(query) {
    const [matches, setMatches] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(query).matches : false
    );
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        mql.addEventListener("change", onChange);
        setMatches(mql.matches);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);
    return matches;
}

const emptyFormState = () => ({
    title: "",
    startTime: getCurrentDateTimeLocal(),
    endTime: getCurrentEndDateTimeLocal(),
    status: "Scheduled",
    group_id: "",
    description: "",
    recordMeeting: "Recording",
    weeklyOption: "Active Weekly",
    poster_file: null,
    files: [],
});

function AdminCreateMeetingForm({
    posterInputId,
    editingMeetingId,
    formData,
    handleInputChange,
    handleFormSubmit,
    groupsLoading,
    groups,
    resetFormForCreate,
}) {
    return (
        <form className="create-meeting-form" onSubmit={handleFormSubmit}>
            <div className="form-group">
                <label>
                    Title <span className="required">*</span>
                </label>
                <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Meeting title"
                />
            </div>

            <div className="form-group">
                <label>
                    Start - End time <span className="required">*</span>
                </label>
                <div className="time-inputs">
                    <input
                        type="datetime-local"
                        name="startTime"
                        className="time-start"
                        value={formData.startTime}
                        onChange={handleInputChange}
                    />
                    <input
                        type="datetime-local"
                        name="endTime"
                        className="time-end"
                        value={formData.endTime}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>
                    Group <span className="required">*</span>
                </label>
                <select
                    name="group_id"
                    value={formData.group_id}
                    onChange={handleInputChange}
                    disabled={groupsLoading}
                >
                    <option value="">Select group...</option>
                    {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                            {g.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label>
                    Status <span className="required">*</span>
                </label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>

            <div className="form-group">
                <label className="mb-2">Record Meeting</label>
                <div className="radio-group">
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="recordMeeting"
                            value="Recording"
                            checked={formData.recordMeeting === "Recording"}
                            onChange={handleInputChange}
                        />
                        Recording
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="recordMeeting"
                            value="Not Recording"
                            checked={formData.recordMeeting === "Not Recording"}
                            onChange={handleInputChange}
                        />
                        Not Recording
                    </label>
                </div>
            </div>
            <div className="form-group">
                <label className="mb-2">Weekly</label>
                <div className="form-group">
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="weeklyOption"
                            value="Active Weekly"
                            checked={formData.weeklyOption === "Active Weekly"}
                            onChange={handleInputChange}
                        />
                        Active
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="weeklyOption"
                            value="Deactive Weekly"
                            checked={formData.weeklyOption === "Deactive Weekly"}
                            onChange={handleInputChange}
                        />
                        Deactive
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Short description"
                />
            </div>

            <div className="form-group">
                <label>
                    Poster {!editingMeetingId && <span className="required">*</span>}
                </label>
                <div className="file-upload">
                    <input
                        type="file"
                        id={posterInputId}
                        name="poster_file"
                        accept="image/*"
                        onChange={handleInputChange}
                    />
                    <label htmlFor={posterInputId} className="file-upload-label">
                        <div className="upload-icon">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="16 16 12 12 8 16" />
                                <line x1="12" y1="12" x2="12" y2="21" />
                                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                            </svg>
                        </div>
                    </label>
                </div>
                {formData.poster_file && (
                    <span className="file-selected-name">{formData.poster_file.name}</span>
                )}
            </div>

            {!editingMeetingId && (
                <div className="form-group">
                    <label>Resources files (optional)</label>
                    <input
                        type="file"
                        name="files"
                        multiple
                        accept="*"
                        onChange={handleInputChange}
                        className="create-meeting-file-input"
                    />
                    {Array.isArray(formData.files) && formData.files.length > 0 && (
                        <div className="selected-files-list">
                            <strong>Selected resources:</strong>
                            <ul>
                                {formData.files.map((f, i) => (
                                    <li key={i}>{f.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="form-actions-row">
                <button type="submit" className="create-meeting-btn">
                    {editingMeetingId ? "Edit Meeting" : "Create Meeting"}
                </button>
                {editingMeetingId && (
                    <button type="button" className="cancel-edit-btn" onClick={resetFormForCreate}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}

const WeeklyDeleteModal = ({ show, onClose, onConfirmThisWeek, onConfirmAllWeeks, confirming }) => {
    if (!show) return null;

    return (
        <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
        >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content rounded-4 border-0" style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title fw-bold" style={{ fontSize: "24px", color: "#010101" }}>
                            Delete Weekly Meeting
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" style={{ fontSize: "14px" }} disabled={confirming} />
                    </div>
                    <div className="modal-body pt-3">
                        <p style={{ fontSize: "16px", color: "#010101", marginBottom: "20px" }}>
                            This is a weekly meeting. What would you like to delete?
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <button
                                type="button"
                                className="btn rounded-3"
                                onClick={onConfirmThisWeek}
                                disabled={confirming}
                                style={{
                                    backgroundColor: "transparent",
                                    color: "#010101",
                                    border: "1px solid transparent",
                                    padding: "12px 20px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    textAlign: "left",
                                }}
                            >
                                📅 Delete for this week only
                            </button>
                            <button
                                type="button"
                                className="btn rounded-3"
                                onClick={onConfirmAllWeeks}
                                disabled={confirming}
                                style={{
                                    backgroundColor: "transparent",
                                    color: "#dc2626",
                                    border: "1px solid transparent",
                                    padding: "12px 20px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    textAlign: "left",
                                }}
                            >
                                🗑️ Delete all weekly meetings
                            </button>
                        </div>
                    </div>
                    <div className="modal-footer border-0 pt-0">
                        <button
                            type="button"
                            className="btn rounded-3"
                            onClick={onClose}
                            disabled={confirming}
                            style={{
                                backgroundColor: "#F4F6F8",
                                color: "#010101",
                                border: "none",
                                padding: "10px 24px",
                                fontSize: "16px",
                                fontWeight: "600",
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminMeetingPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [meetings, setMeetings] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [groupsLoading, setGroupsLoading] = useState(false);
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

    // Fetch groups for create-meeting dropdown (same API as meetza-admin)
    const fetchGroups = async () => {
        try {
            setGroupsLoading(true);
            const res = await api.get("/group");
            const payload = Array.isArray(res.data) ? res.data : res.data?.data || [];
            const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser?.role === "Super_Admin";
            const isAdministrator = currentUser?.role === "Administrator";
            let list = payload;
            if (isAdministrator && !isSuperAdmin) {
                list = payload.filter(
                    (g) =>
                        g.admin_id === currentUser?.id ||
                        g.adminId === currentUser?.id ||
                        g.administrator_id === currentUser?.id ||
                        g.user_id === currentUser?.id
                );
            }
            setGroups(list.map((g) => ({ id: g.id, name: g.name || g.group_name })));
        } catch (error) {
            console.error("Error fetching groups:", error);
            smartToast.error("Failed to load groups");
        } finally {
            setGroupsLoading(false);
        }
    };

    useEffect(() => {
        fetchMeetings();
        fetchGroups();
    }, []);

    // GET /meeting with token – backend returns only this admin's meetings for Administrator role
    const fetchMeetings = async (options) => {
        try {
            setLoading(true);
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
            // Client-side filter: show only meetings where current user is administrator (if backend didn't)
            const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");
            const isAdmin = currentUser?.role === "Administrator" || currentUser?.role === "Super_Admin";
            if (isAdmin && currentUser?.id) {
                const filtered = meetingsList.filter(
                    (m) => m.administrator_id === currentUser.id || currentUser.role === "Super_Admin"
                );
                meetingsList = currentUser.role === "Super_Admin" ? meetingsList : filtered;
            }
            const patch = options?.patchRecordMeeting;
            if (patch?.id != null) {
                meetingsList = meetingsList.map((m) =>
                    (m.id === patch.id || m.meeting_id === patch.id) ? { ...m, record_meeting: patch.value } : m
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
        } catch (error) {
            console.error("Error fetching meetings:", error);
            smartToast.error("Failed to load meetings");
        } finally {
            setLoading(false);
        }
    };

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
            form.append("weekly", formData.weeklyOption === "Active Weekly" ? "1" : formData.weeklyOption === "Deactive Weekly" ? "0" : "");

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
            smartToast.error(
                error.response?.data?.message || "Failed to create meeting"
            );
        }
    };

    const handleJoinMeeting = async (meetingId) => {
        if (!meetingId) return;
        try {
            await api.post(`/meeting/${meetingId}/join`);
            navigate("/meetings", { state: { meetingId } });
        } catch (err) {
            smartToast.error(err.response?.data?.message || "Failed to join meeting");
        }
    };

    const handleWeeklyStatusChange = async (meetingId, newStatus) => {
        if (!meetingId) return;
        try {
            if (newStatus === 'active') {
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
                // First deactivate recurrence for all future weeks
                await api.patch(`/meeting/${meetingId}/deactivate-recurrence`);
                // Then delete the current meeting
                res = await api.delete(`/meeting/${meetingId}`);
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
            weeklyOption: "Active Weekly",
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

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const day = days[date.getDay()];
        const dayNum = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day} ${dayNum}/${month}/${year}`;
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, "0");
        return `${displayHours}:${displayMinutes} ${period}`;
    };

    const getTimeRange = (startTime, endTime) => {
        const start = formatTime(startTime);
        const end = formatTime(endTime);
        return `${start} to ${end}`;
    };

    /** True if meeting end_time has passed (meeting is over). */
    const isMeetingEnded = (meeting) => {
        const endTime = meeting?.end_time;
        if (!endTime) return false;
        return new Date() > new Date(endTime);
    };

    return (
        <div className="admin-meeting-page">
            {/* ── LEFT CONTENT ── */}
            <div className="admin-meeting-content">
                {/* Header */}
                <div className="admin-meeting-header">
                    <div className="admin-meeting-header-row">
                        <h1>Admin Meeting page</h1>
                        <button
                            type="button"
                            className="admin-meeting-header-create-btn"
                            onClick={openCreateMeetingModal}
                        >
                            Create meeting
                        </button>
                    </div>
                </div>

                {/* Meetings Grid */}
                <div className="meetings-grid">
                    {loading ? (
                        <div className="loading-message">Loading meetings…</div>
                    ) : meetings.length === 0 ? (
                        <div className="no-meetings">No meetings available</div>
                    ) : (
                        meetings.map((meeting) => (
                            <div className="meeting-card" key={meeting.id || meeting.meeting_id}>
                                {/* Top: thumbnail + info + date */}
                                <div className="meeting-card-top">
                                    <div className="meeting-thumbnail">
                                        {(() => {
                                            const poster = meeting.poster_url || meeting.poster;
                                            const posterSrc = (typeof poster === "string" && poster.trim()) ? poster.trim() : null;
                                            return posterSrc ? (
                                            <img
                                                src={posterSrc}
                                                alt="meeting"
                                                onError={(e) => {
                                                    e.target.style.display = "none";
                                                }}
                                            />
                                            ) : (
                                            <div className="default-thumbnail">
                                                <VideoCamera size={18} weight="fill" />
                                            </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="meeting-card-info">
                                        <p className="meeting-name">
                                            {meeting.title || meeting.group_name || "Group name"}
                                        </p>
                                        <p className="meeting-subtitle">
                                            {meeting.group_id ? (
                                                <Link
                                                    to="/home"
                                                    state={{ groupId: meeting.group_id }}
                                                    className="meeting-group-link"
                                                >
                                                    {meeting.course || groups.find((g) => g.id === meeting.group_id)?.name || "—"}
                                                </Link>
                                            ) : (
                                                meeting.course || groups.find((g) => g.id === meeting.group_id)?.name || "—"
                                            )}
                                        </p>
                                    </div>

                                    <span className="meeting-date">
                                        {formatDate(meeting.start_time || meeting.created_at)}
                                    </span>
                                </div>

                                {/* Divider */}
                                <div className="meeting-card-divider" />

                                {/* Body */}
                                <div className="meeting-card-body">
                                    <p className="meeting-description">
                                        <strong>Description : </strong>
                                        {meeting.description ||
                                            "No description"}
                                    </p>

                                    <div className={`recorded-meeting ${isRecording(meeting.record_meeting) ? "recorded" : "not-recorded"}`}>
                                        {isRecording(meeting.record_meeting) ? (
                                            <VideoCameraIcon size={32} weight="fill" />
                                        ) : (
                                            <VideoCameraSlashIcon size={18} weight="fill" />
                                        )}
                                        Recorded Meeting
                                    </div>

                                    <div className="weekly-meeting-dropdown">
                                        <button
                                            type="button"
                                            className={`weekly-meeting-trigger ${meeting.is_weekly === 1 ? "weekly-active" : meeting.is_weekly === 0 ? "weekly-inactive" : ""}`}
                                            onClick={() => setWeeklyDropdownOpen(weeklyDropdownOpen === meeting.id ? null : meeting.id)}
                                        >
                                            {meeting.is_weekly === 1 ? (
                                                <CalendarPlusIcon size={20} weight="fill" />
                                            ) : meeting.is_weekly === 0 ? (
                                                <CalendarXIcon size={20} weight="fill" />
                                            ) : (
                                                <CalendarPlusIcon size={20} weight="fill" />
                                            )}
                                            {meeting.is_weekly === 1 ? "Active Weekly" : meeting.is_weekly === 0 ? "Deactive Weekly" : "Set Weekly"}
                                            <CaretDown size={12} weight="bold" />
                                        </button>

                                        {weeklyDropdownOpen === meeting.id && (
                                            <div className="weekly-dropdown-menu">
                                                <button
                                                    type="button"
                                                    className="weekly-dropdown-item"
                                                    onClick={() => handleWeeklyStatusChange(meeting.id || meeting.meeting_id, 'active')}
                                                >
                                                    <CalendarPlusIcon size={16} weight="fill" />
                                                    Active Weekly
                                                </button>
                                                <button
                                                    type="button"
                                                    className="weekly-dropdown-item"
                                                    onClick={() => handleWeeklyStatusChange(meeting.id || meeting.meeting_id, 'deactive')}
                                                >
                                                    <CalendarXIcon size={16} weight="fill" />
                                                    Deactive Weekly
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <p className="meeting-time">
                                        <strong>Time : </strong>
                                        {getTimeRange(meeting.start_time, meeting.end_time)}
                                    </p>

                                    <button
                                        type="button"
                                        className={`join-meeting-btn ${isMeetingEnded(meeting) ? "join-meeting-btn--ended" : ""}`}
                                        onClick={() =>
                                            !isMeetingEnded(meeting) && handleJoinMeeting(meeting.id || meeting.meeting_id)
                                        }
                                        disabled={isMeetingEnded(meeting)}
                                        title={isMeetingEnded(meeting) ? "Meeting has ended" : "Join meeting"}
                                    >
                                        {isMeetingEnded(meeting) ? "Ended" : "Join"}
                                    </button>

                                    <div className="meeting-card-actions">
                                        <button
                                            type="button"
                                            className="meeting-card-action-btn edit-btn"
                                            onClick={() => handleEditMeeting(meeting)}
                                            title="Edit"
                                            aria-label="Edit meeting"
                                        >
                                            <PencilSimple size={18} weight="regular" />
                                        </button>
                                        <button
                                            type="button"
                                            className="meeting-card-action-btn delete-btn"
                                            onClick={() => handleDeleteMeetingClick(meeting)}
                                            title="Delete"
                                            aria-label="Delete meeting"
                                        >
                                            <Trash size={18} weight="regular" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── RIGHT SIDEBAR (desktop only; mobile/tablet uses modal) ── */}
            {!isMobileTablet && (
                <div className="create-meeting-sidebar">
                    <h2>{editingMeetingId ? "Edit Meeting" : "Create Meeting"}</h2>
                    <AdminCreateMeetingForm
                        posterInputId="poster-upload"
                        editingMeetingId={editingMeetingId}
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleFormSubmit={handleFormSubmit}
                        groupsLoading={groupsLoading}
                        groups={groups}
                        resetFormForCreate={resetFormForCreate}
                    />
                </div>
            )}

            {isMobileTablet && showCreateMeetingModal && (
                <div
                    className="admin-meeting-modal-overlay"
                    role="presentation"
                    onClick={closeCreateMeetingModal}
                >
                    <div
                        className="admin-meeting-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-meeting-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-meeting-modal-toolbar">
                            <h2 id="admin-meeting-modal-title">
                                {editingMeetingId ? "Edit Meeting" : "Create Meeting"}
                            </h2>
                            <button
                                type="button"
                                className="admin-meeting-modal-close"
                                onClick={closeCreateMeetingModal}
                                aria-label="Close dialog"
                            >
                                ×
                            </button>
                        </div>
                        <div className="admin-meeting-modal-body">
                            <AdminCreateMeetingForm
                                posterInputId="poster-upload-modal"
                                editingMeetingId={editingMeetingId}
                                formData={formData}
                                handleInputChange={handleInputChange}
                                handleFormSubmit={handleFormSubmit}
                                groupsLoading={groupsLoading}
                                groups={groups}
                                resetFormForCreate={resetFormForCreate}
                            />
                        </div>
                    </div>
                </div>
            )}

            <WeeklyDeleteModal
                show={showWeeklyDeleteModal}
                onClose={closeWeeklyDeleteModal}
                onConfirmThisWeek={() => confirmDeleteMeeting(false)}
                onConfirmAllWeeks={() => confirmDeleteMeeting(true)}
                confirming={deletingMeeting}
            />

            <ConfirmDeleteModal
                show={showDeleteMeetingModal}
                onClose={closeDeleteMeetingModal}
                onConfirm={confirmDeleteMeeting}
                title="Delete Meeting"
                message="Are you sure you want to delete this meeting? This action cannot be undone."
                confirming={deletingMeeting}
            />
        </div>
    );
};

export default AdminMeetingPage;