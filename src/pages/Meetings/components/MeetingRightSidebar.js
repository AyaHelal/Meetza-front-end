import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Microphone, MicrophoneSlash, Paperclip, PlusCircle, Trash, UserCircle } from '@phosphor-icons/react';
import './MeetingRightSidebar.css';
import api from '../../../API/axiosInstance';
import { smartToast } from '../../../API/toastManager';
import { AuthContext } from '../../../context/AuthContext';
import { useMeetingContext } from '../../../context/MeetingContext';
import { useSocket } from '../../../context/SocketContext';

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
    const authUser = React.useContext(AuthContext)?.user;
    const user = useMemo(() => {
        if (authUser) return authUser;
        try {
            const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [authUser]);
    const { socket } = useSocket();
    const { participants: socketParticipants, hasJoined, meetingId: contextMeetingId, localParticipantAudioMuted, setLocalParticipantAudioMuted } = useMeetingContext();

    const meetingId = useMemo(() => {
        // Prefer context (set by MeetingRoom, persists across navigation), then location,
        // then sessionStorage (persists across navigation)
        if (contextMeetingId) return contextMeetingId;
        const fromLocation =
            location?.state?.meetingId || searchParams.get("meetingId") || null;
        if (fromLocation) return fromLocation;
        try {
            return sessionStorage.getItem("activeMeetingId") || null;
        } catch {
            return null;
        }
    }, [contextMeetingId, location?.state?.meetingId, searchParams]);
    const [meetingDescription, setMeetingDescription] = useState('');
    const [meetingInfo, setMeetingInfo] = useState(null);
    const [groupContentId, setGroupContentId] = useState(null);
    const [resources, setResources] = useState([]);
    const [loadingResources, setLoadingResources] = useState(false);
    const [uploadingResource, setUploadingResource] = useState(false);
    const [deletingResourceId, setDeletingResourceId] = useState(null);
    const fileInputRef = useRef(null);

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
            setMeetingInfo(meeting ? { group_id: meeting.group_id, administrator_id: meeting.administrator_id } : null);
        } catch (err) {
            console.warn("Could not fetch meeting details:", err);
            setMeetingDescription('');
            setMeetingInfo(null);
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
            const contentId = root?.group_content_id ?? payload[0]?.group_content_id ?? null;
            setGroupContentId(contentId);
        } catch (err) {
            console.error("❌ Error fetching meeting resources:", err);
            setResources([]);
        } finally {
            setLoadingResources(false);
        }
    }, []);

    const currentUserId = user?.id ?? user?.user_id ?? null;
    const isMeetingAdmin = Boolean(
        currentUserId && meetingInfo?.administrator_id && String(currentUserId) === String(meetingInfo.administrator_id)
    );
    const showAddResourceBtn = isMeetingAdmin && meetingId;
    const canAddResource = showAddResourceBtn && groupContentId;

    const handleAddResource = useCallback(
        async (e) => {
            const files = e?.target?.files;
            if (!files?.length || !groupContentId || !meetingId) {
                e.target.value = '';
                return;
            }
            setUploadingResource(true);
            try {
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
                formData.append('meeting_id', meetingId);
                await api.post(`/group-contents/${groupContentId}/files`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                smartToast.success('Resource(s) added.');
                await fetchResources(meetingId);
                if (socket) socket.emit('meetingResourceAdded', { meetingId });
            } catch (err) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to add resource';
                smartToast.error(msg);
            } finally {
                setUploadingResource(false);
                e.target.value = '';
            }
        },
        [groupContentId, meetingId, fetchResources, socket]
    );

    const handleDeleteResource = useCallback(
        async (resourceId) => {
            if (!groupContentId || !meetingId || !resourceId) return;
            if (!window.confirm('Delete this resource?')) return;
            setDeletingResourceId(resourceId);
            try {
                await api.delete(`/group-contents/${groupContentId}/files/${resourceId}`);
                smartToast.success('Resource removed.');
                await fetchResources(meetingId);
                if (socket) socket.emit('meetingResourceAdded', { meetingId });
            } catch (err) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to delete resource';
                smartToast.error(msg);
            } finally {
                setDeletingResourceId(null);
            }
        },
        [groupContentId, meetingId, fetchResources, socket]
    );

    // Participants are socket-driven from MeetingContext - no REST fetch
    const participants = hasJoined ? socketParticipants : [];
    const getParticipantUserId = (p) => p?.member_id ?? p?.user_id ?? p?.userId ?? p?.id;
    const isParticipantMeetingAdmin = (p) =>
        Boolean(meetingInfo?.administrator_id && getParticipantUserId(p) && String(getParticipantUserId(p)) === String(meetingInfo.administrator_id));
    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => {
            const aAdmin = isParticipantMeetingAdmin(a);
            const bAdmin = isParticipantMeetingAdmin(b);
            if (aAdmin && !bAdmin) return -1;
            if (!aAdmin && bAdmin) return 1;
            return 0;
        });
    }, [participants, meetingInfo?.administrator_id]);

    // Fetch meeting details to get description + group_id for admin add-resource
    useEffect(() => {
        fetchMeetingDetails(meetingId);
    }, [fetchMeetingDetails, meetingId]);

    // group_content_id comes from GET /group-contents/meeting/:id response (set in fetchResources)

    // Fetch resources attached to this meeting (also sets group_content_id from API for add-resource)
    useEffect(() => {
        fetchResources(meetingId);
    }, [fetchResources, meetingId]);

    // When admin adds a resource, server broadcasts meetingResourceAdded → members refetch immediately (if socket used)
    useEffect(() => {
        if (!socket || !meetingId) return;
        const onResourceAdded = (data) => {
            if (data?.meetingId && String(data.meetingId) === String(meetingId)) {
                fetchResources(meetingId);
            }
        };
        socket.on('meetingResourceAdded', onResourceAdded);
        return () => {
            socket.off('meetingResourceAdded', onResourceAdded);
        };
    }, [socket, meetingId, fetchResources]);

    // Poll resources periodically so members see new resources without refresh (frontend-only, no socket required)
    useEffect(() => {
        if (!meetingId) return;
        const intervalMs = 12000;
        const tid = setInterval(() => {
            const mid = meetingIdRef.current;
            if (mid) fetchResources(mid);
        }, intervalMs);
        return () => clearInterval(tid);
    }, [meetingId, fetchResources]);

    // Refresh meeting details periodically (description, admin info).
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
        <div className="meeting-right-sidebar px-0">
            {/* Meeting Description + Resources */}
            <div className="video-description-card">
                <div className="video-description-header">
                    <h3 className="video-description-title fw-semibold">Video Description</h3>
                    {showAddResourceBtn && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="*"
                                onChange={handleAddResource}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                className="add-resource-btn"
                                onClick={() => {
                                    if (!groupContentId) {
                                        smartToast.error('Group content not available for this meeting.');
                                        return;
                                    }
                                    fileInputRef.current?.click();
                                }}
                                disabled={uploadingResource}
                                title={!groupContentId ? 'Preparing...' : 'Add resource'}
                                aria-label="Add resource"
                            >
                                <PlusCircle size={18} weight="regular" />
                                {uploadingResource ? ' ...' : ''}
                            </button>
                        </>
                    )}
                </div>
                <div className="video-description-scroll">
                    <p className="video-description-subtitle">
                        {meetingDescription
                            ? meetingDescription
                            : "No description provided for this meeting."}
                    </p>
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
                                className="description-item description-item--with-actions"
                                title={resItem.file_name || resItem.name}
                            >
                                <Paperclip size={20} weight="regular" className="item-icon" />
                                <a
                                    href={resItem.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="description-item-link"
                                >
                                    {resItem.file_name || 'Resource file'}
                                </a>
                                {showAddResourceBtn && groupContentId && (
                                    <button
                                        type="button"
                                        className="resource-delete-btn"
                                        onClick={() => handleDeleteResource(resItem.id)}
                                        disabled={deletingResourceId === resItem.id}
                                        title="Delete resource"
                                        aria-label="Delete resource"
                                    >
                                        <Trash size={14} weight="regular" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                    </div>
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
                    ) : sortedParticipants.map((participant, index) => {
                        const isAdmin = isParticipantMeetingAdmin(participant);
                        const socketId = participant?.socketId;
                        const isMuted = socketId ? !!localParticipantAudioMuted[socketId] : false;
                        const showMuteBtn = isMeetingAdmin && !isAdmin && socketId;
                        return (
                        <div
                            key={participant?.socketId || participant?.member_id || participant?.id || index}
                            className={`participant-item ${isAdmin ? 'participant-item--admin-pinned' : ''}`}
                        >
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
                                    {isAdmin && <span className="participant-badge-admin">Admin</span>}
                                </span>
                                <span className={`participant-status ${getParticipantStatusLabel(participant).toLowerCase()}`}>
                                    {getParticipantStatusLabel(participant)}
                                </span>
                            </div>
                            {showMuteBtn && (
                                <button
                                    type="button"
                                    className="participant-mute-btn"
                                    onClick={() => setLocalParticipantAudioMuted((prev) => ({ ...prev, [socketId]: !prev[socketId] }))}
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted ? (
                                        <MicrophoneSlash size={20} weight="regular" />
                                    ) : (
                                        <Microphone size={20} weight="regular" />
                                    )}
                                </button>
                            )}
                        </div>
                    );})}
                </div>
            </div>
        </div>
    );
};

export default MeetingRightSidebar;

