import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../API/axiosInstance";
import { smartToast } from "../../API/toastManager";
import "./AdminMeetingPage.css";
import { VideoCamera, VideoCameraIcon, VideoCameraSlashIcon, PencilSimple, Trash } from "@phosphor-icons/react";

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

const AdminMeetingPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [meetings, setMeetings] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [editingMeetingId, setEditingMeetingId] = useState(null);

    const [formData, setFormData] = useState({
        title: "",
        startTime: getCurrentDateTimeLocal(),
        endTime: getCurrentEndDateTimeLocal(),
        status: "Scheduled",
        group_id: "",
        description: "",
        recordMeeting: "Recording",
        poster_file: null,
        files: [],
    });

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
            form.append("record_meeting", formData.recordMeeting === "Recording" ? "1" : "0");
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
            setFormData({
                title: "",
                startTime: getCurrentDateTimeLocal(),
                endTime: getCurrentEndDateTimeLocal(),
                status: "Scheduled",
                group_id: "",
                description: "",
                recordMeeting: "Recording",
                poster_file: null,
                files: [],
            });
            fetchMeetings(createdMeeting?.id ? { patchRecordMeeting: { id: createdMeeting.id, value: recordValue } } : undefined);
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

    const resetFormForCreate = () => {
        setEditingMeetingId(null);
        setFormData({
            title: "",
            startTime: getCurrentDateTimeLocal(),
            endTime: getCurrentEndDateTimeLocal(),
            status: "Scheduled",
            group_id: "",
            description: "",
            recordMeeting: "Recording",
            poster_file: null,
            files: [],
        });
    };

    const handleDeleteMeeting = async (meetingId) => {
        if (!window.confirm("Are you sure you want to delete this meeting?")) return;
        try {
            const res = await api.delete(`/meeting/${meetingId}`);
            if (res.data?.success !== false) {
                setMeetings((prev) => prev.filter((m) => (m.id || m.meeting_id) !== meetingId));
                smartToast.success("Meeting deleted successfully");
                const flags = getStoredRecordFlags();
                delete flags[meetingId];
                localStorage.setItem(STORAGE_KEY_RECORD_FLAGS, JSON.stringify(flags));
            } else {
                smartToast.error(res.data?.message || "Failed to delete meeting");
            }
        } catch (err) {
            smartToast.error(err.response?.data?.message || "Error deleting meeting");
        }
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
            poster_file: null,
            files: [],
        });
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
                } else smartToast.error(res.data?.message || "Failed to update meeting");
            } else {
                const payload = {
                    title: formData.title,
                    start_time: formatForAPI(formData.startTime),
                    end_time: formatForAPI(formData.endTime),
                    status: formData.status,
                    group_id: formData.group_id || originalMeeting.group_id,
                };
                const res = await api.put(`/meeting/${editingMeetingId}`, payload);
                if (res.data?.success) {
                    smartToast.success("Meeting updated successfully");
                    setStoredRecordFlag(editingMeetingId, formData.recordMeeting === "Recording" ? 1 : 0);
                    resetFormForCreate();
                    fetchMeetings();
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

    return (
        <div className="admin-meeting-page">
            {/* ── LEFT CONTENT ── */}
            <div className="admin-meeting-content">
                {/* Header */}
                <div className="admin-meeting-header">
                    <h1>Admin Meeting page</h1>
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
                                        {(meeting.poster_url || meeting.poster) ? (
                                            <img
                                                src={meeting.poster_url || meeting.poster}
                                                alt="meeting"
                                                onError={(e) => {
                                                    e.target.style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="default-thumbnail">
                                                <VideoCamera size={18} weight="fill" />
                                            </div>
                                        )}
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

                                    <p className="meeting-time">
                                        <strong>Time : </strong>
                                        {getTimeRange(meeting.start_time, meeting.end_time)}
                                    </p>

                                    <button
                                        className="join-meeting-btn"
                                        onClick={() =>
                                            handleJoinMeeting(meeting.id || meeting.meeting_id)
                                        }
                                    >
                                        Join
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
                                            onClick={() => handleDeleteMeeting(meeting.id || meeting.meeting_id)}
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

            {/* ── RIGHT SIDEBAR ── */}
            <div className="create-meeting-sidebar">
                <h2>{editingMeetingId ? "Edit Meeting" : "Create Meeting"}</h2>

                <form className="create-meeting-form" onSubmit={handleFormSubmit}>
                    {/* Title */}
                    <div className="form-group">
                        <label>Title <span className="required">*</span></label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Meeting title"
                        />
                    </div>

                    {/* Start – End time */}
                    <div className="form-group">
                        <label>Start - End time <span className="required">*</span></label>
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

                    {/* Group – same as meetza-admin */}
                    <div className="form-group">
                        <label>Group <span className="required">*</span></label>
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

                    {/* Status */}
                    <div className="form-group">
                        <label>Status <span className="required">*</span></label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                        >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Record Meeting – يتبعت في create كـ 0 أو 1 */}
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

                    {/* Description */}
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

                    {/* Poster – مطلوب في Create فقط */}
                    <div className="form-group">
                        <label>Poster {!editingMeetingId && <span className="required">*</span>}</label>
                        <div className="file-upload">
                            <input
                                type="file"
                                id="poster-upload"
                                name="poster_file"
                                accept="image/*"
                                onChange={handleInputChange}
                            />
                            <label htmlFor="poster-upload" className="file-upload-label">
                                <div className="upload-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                    {/* Submit / Cancel */}
                    <div className="form-actions-row">
                        <button type="submit" className="create-meeting-btn">
                            {editingMeetingId ? "Edit Meeting" : "Create Meeting"}
                        </button>
                        {editingMeetingId && (
                            <button
                                type="button"
                                className="cancel-edit-btn"
                                onClick={resetFormForCreate}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>

            </div>
        </div>
    );
};

export default AdminMeetingPage;