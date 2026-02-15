import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Paperclip, UserCircle } from '@phosphor-icons/react';
import './MeetingRightSidebar.css';
import api from '../../../API/axiosInstance';
import { smartToast } from '../../../API/toastManager';
import { useMeetingContext } from '../../../context/MeetingContext';

const MeetingRightSidebar = () => {
    const getParticipantDisplayName = (p, fallbackIndex) => {
        // Handle common participant shapes returned by APIs
        // Examples:
        // - { name: "..." }
        // - { member_name: "..." } (your backend)
        // - { full_name: "..." }
        // - { user: { name / full_name / username / email } }
        // - { participant: { user: {...} } }
        const user =
            p?.user ||
            p?.participant?.user ||
            p?.profile ||
            null;

        return (
            p?.member_name ||
            p?.name ||
            p?.full_name ||
            p?.fullName ||
            p?.username ||
            p?.member_email ||
            p?.email ||
            user?.name ||
            user?.full_name ||
            user?.fullName ||
            user?.username ||
            user?.email ||
            `Participant ${fallbackIndex + 1}`
        );
    };

    const getParticipantStatusLabel = (p) => {
        // Your current API response doesn't include a status field.
        // If backend later adds presence fields, we support them here.
        if (typeof p?.is_online === "boolean") return p.is_online ? "Online" : "Offline";
        if (p?.left_at || p?.leftAt) return "Offline";
        // For "participants" list, default to Online (they are currently in the meeting)
        return "Online";
    };

    const location = useLocation();
    const [searchParams] = useSearchParams();

    const meetingId = useMemo(() => {
        // Prefer navigation state (set when joining), then query string (?meetingId=...)
        return (
            location?.state?.meetingId ||
            searchParams.get("meetingId") ||
            null
        );
    }, [location?.state?.meetingId, searchParams]);

    const { participants: socketParticipants, hasJoined } = useMeetingContext();
    const [meetingDescription, setMeetingDescription] = useState('');
    const [resources, setResources] = useState([]);
    const [loadingResources, setLoadingResources] = useState(false);

    const meetingIdRef = useRef(meetingId);
    useEffect(() => {
        meetingIdRef.current = meetingId;
    }, [meetingId]);

    const fetchMeetingDetails = useCallback(async (mid) => {
        if (!mid) return;
        try {
            const res = await api.get(`/meeting/${mid}`);
            const root = res?.data;
            let meeting;
            if (root?.data) {
                meeting = Array.isArray(root.data)
                    ? root.data.find((m) => String(m.id) === String(mid))
                    : root.data;
            } else if (root?.id) {
                meeting = root;
            }
            setMeetingDescription(meeting?.description || '');
        } catch (err) {
            console.warn("Could not fetch meeting details:", err);
            setMeetingDescription('');
        }
    }, []);

    const fetchResources = useCallback(async (mid) => {
        if (!mid) return;
        setLoadingResources(true);
        try {
            const res = await api.get(`/group-contents/meeting/${mid}`);
            const root = res?.data;
            const payload = Array.isArray(root)
                ? root
                : Array.isArray(root?.data)
                    ? root.data
                    : [];
            setResources(payload);
        } catch (err) {
            console.error("❌ Error fetching meeting resources:", err);
            setResources([]);
        } finally {
            setLoadingResources(false);
        }
    }, []);

    // Participants are socket-driven from MeetingContext - no REST fetch
    const participants = hasJoined ? socketParticipants : [];

    // Fetch meeting details to get description
    useEffect(() => {
        fetchMeetingDetails(meetingId);
    }, [fetchMeetingDetails, meetingId]);

    // Fetch resources attached to this meeting
    useEffect(() => {
        fetchResources(meetingId);
    }, [fetchResources, meetingId]);

    // Refresh meeting details and participants periodically; resources are loaded once only
    useEffect(() => {
        if (!meetingId) return;

        const refresh = () => {
            const mid = meetingIdRef.current;
            if (!mid) return;
            fetchMeetingDetails(mid);
        };

        const intervalMs = 5000;
        const intervalId = setInterval(refresh, intervalMs);

        const onFocus = () => refresh();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') refresh();
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [fetchMeetingDetails, meetingId]);

    return (
        <div className="meeting-right-sidebar px-2">
            {/* Meeting Description + Resources */}
            <div className="video-description-card p-4">
                <div>
                    <h3 className="video-description-title fw-semibold">Video Description</h3>
                    <p className="video-description-subtitle">
                        {meetingDescription
                            ? meetingDescription
                            : "No description provided for this meeting."}
                    </p>
                </div>

                <div className="video-description-items">
                    {loadingResources ? (
                        <div className="description-item">
                            <span>Loading resources...</span>
                        </div>
                    ) : resources.length === 0 ? (
                        <div className="description-item">
                            <span>No resources attached to this meeting.</span>
                        </div>
                    ) : (
                        resources.map((resItem) => (
                            <div
                                key={resItem.id}
                                className="description-item"
                                title={resItem.file_name || resItem.name}
                            >
                                <Paperclip size={20} weight="regular" className="item-icon" />
                                <a
                                    href={resItem.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    {resItem.file_name || 'Resource file'}
                                </a>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Participate Card */}
            <div className="participate-card">
                <h3 className="participate-title fw-semibold">Participate</h3>
                <div className="participants-list ">
                    {!meetingId ? (
                        <div className="participant-item">
                            <div className="participant-info">
                                <span className="participant-name fw-semibold">No meeting selected</span>
                                <span className="participant-status offline">Open meeting from “Join Meeting” to load participants</span>
                            </div>
                        </div>
                    ) : participants.length === 0 ? (
                        <div className="participant-item">
                            <div className="participant-info">
                                <span className="participant-name fw-semibold">No participants</span>
                            </div>
                        </div>
                    ) : participants.map((participant, index) => (
                        <div key={participant?.socketId || participant?.member_id || participant?.id || index} className="participant-item">
                            <div className="participant-avatar">
                                {(participant?.member_photo || participant?.memberPhoto || participant?.user_photo) ? (
                                    <img
                                        src={participant.member_photo || participant.memberPhoto || participant.user_photo}
                                        alt={getParticipantDisplayName(participant, index)}
                                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                                    />
                                ) : (
                                    <UserCircle size={40} weight="fill" />
                                )}
                            </div>
                            <div className="participant-info">
                                <span className="participant-name fw-semibold">
                                    {getParticipantDisplayName(participant, index)}
                                </span>
                                <span className={`participant-status ${getParticipantStatusLabel(participant).toLowerCase()}`}>
                                    {getParticipantStatusLabel(participant)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MeetingRightSidebar;

