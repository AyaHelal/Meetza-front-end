import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../API/axiosInstance";
import { smartToast } from "../../API/toastManager";
import "./AdminMeetingPage.css";
import { VideoCamera, VideoCameraIcon, VideoCameraSlashIcon } from "@phosphor-icons/react";
import UserPhoto from "../../components/UserPhoto/UserPhoto";

// Helper function to get today's date with time in datetime-local format
const getDefaultDateTime = (hours, minutes) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const AdminMeetingPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Static meeting cards for design preview
    const staticMeetings = [
        {
            id: "static-1",
            title: "Introduction to React",
            course: "Web Development",
            description: "Learn the fundamentals of React including components, props, and state management. This session will cover the basics and help you get started with building modern web applications.",
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            record_meeting: true,
            poster: null
        },
        {
            id: "static-2",
            title: "Database Design Principles",
            course: "Database Systems",
            description: "Understanding relational database design, normalization, and SQL queries. We'll explore best practices for creating efficient and scalable database schemas.",
            start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            record_meeting: false,
            poster: null
        }
    ];

    const [meetings, setMeetings] = useState(staticMeetings);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        startTime: getDefaultDateTime(8, 25),
        endTime: getDefaultDateTime(10, 20),
        status: "",
        recordMeeting: "Recording",
        poster: null,
        resources: "",
    });

    useEffect(() => {
        // Uncomment to fetch real meetings
        // fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const response = await api.get("/meeting");
            const data = response?.data;
            let meetingsList = [];
            if (Array.isArray(data?.data)) {
                meetingsList = data.data;
            } else if (Array.isArray(data)) {
                meetingsList = data;
            } else if (data?.success && Array.isArray(data?.data)) {
                meetingsList = data.data;
            }
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
        if (name === "poster") {
            setFormData((prev) => ({ ...prev, poster: files[0] || null }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleCreateMeeting = async (e) => {
        e.preventDefault();
        try {
            // Convert datetime-local to ISO format for API
            const startDateTime = formData.startTime
                ? new Date(formData.startTime).toISOString()
                : "";
            const endDateTime = formData.endTime
                ? new Date(formData.endTime).toISOString()
                : "";

            const meetingData = new FormData();
            meetingData.append("title", formData.title);
            if (startDateTime) meetingData.append("start_time", startDateTime);
            if (endDateTime) meetingData.append("end_time", endDateTime);
            meetingData.append("status", formData.status);
            meetingData.append(
                "record_meeting",
                formData.recordMeeting === "Recording"
            );
            if (formData.poster) meetingData.append("poster", formData.poster);
            if (formData.resources) meetingData.append("resources", formData.resources);

            await api.post("/meeting", meetingData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            smartToast.success("Meeting created successfully!");
            setFormData({
                title: "",
                startTime: getDefaultDateTime(8, 25),
                endTime: getDefaultDateTime(10, 20),
                status: "",
                recordMeeting: "Recording",
                poster: null,
                resources: "",
            });
            fetchMeetings();
        } catch (error) {
            console.error("Error creating meeting:", error);
            smartToast.error(
                error.response?.data?.message || "Failed to create meeting"
            );
        }
    };

    const handleJoinMeeting = (meetingId) => {
        navigate("/meetings", { state: { meetingId } });
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
                    <p>Group Meeting name</p>
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
                                        {meeting.poster ? (
                                            <img
                                                src={meeting.poster}
                                                alt="meeting"
                                                onError={(e) => {
                                                    e.target.style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="default-thumbnail">
                                                <VideoCamera size={28} weight="fill" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="meeting-card-info">
                                        <p className="meeting-name">
                                            {meeting.title || meeting.group_name || "Group name"}
                                        </p>
                                        <p className="meeting-subtitle">
                                            {meeting.course || "OOP 1st semester"}
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
                                            "It's all about the attraction of someone towards you and how that effects the brain"}
                                    </p>

                                    <div className={`recorded-meeting ${meeting.record_meeting ? 'recorded' : 'not-recorded'}`}>
                                        {meeting.record_meeting ? (
                                            /* Camera icon - Recording enabled */
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <VideoCameraIcon size={24} />

                                            </svg>
                                        ) : (
                                            /* Camera icon with slash - Recording disabled */
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            ><VideoCameraSlashIcon size={24} />


                                            </svg>
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
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="create-meeting-sidebar">
                <h2>Create Meeting</h2>

                <form className="create-meeting-form" onSubmit={handleCreateMeeting}>
                    {/* Title */}
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder=""
                        />
                    </div>

                    {/* Start – End time */}
                    <div className="form-group">
                        <label>Start - End time</label>
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

                    {/* Status */}
                    <div className="form-group">
                        <label>Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                        >
                            <option value="" disabled>
                                Select
                            </option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Record Meeting */}
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
                        </div>
                    </div>

                    {/* Poster */}
                    <div className="form-group">
                        <label>Poster</label>
                        <div className="file-upload">
                            <input
                                type="file"
                                id="poster-upload"
                                name="poster"
                                accept="image/*"
                                onChange={handleInputChange}
                            />
                            <label htmlFor="poster-upload" className="file-upload-label">
                                <div className="upload-icon">
                                    {/* Upload arrow icon */}
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
                        {formData.poster && (
                            <span style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                                {formData.poster.name}
                            </span>
                        )}
                    </div>

                    {/* Resources */}
                    <div className="form-group">
                        <label>Resources</label>
                        <textarea
                            name="resources"
                            value={formData.resources}
                            onChange={handleInputChange}
                            rows={4}
                        />
                    </div>

                    {/* Submit */}
                    <button type="submit" className="create-meeting-btn">
                        Create Meeting
                    </button>
                </form>

            </div>
        </div>
    );
};

export default AdminMeetingPage;