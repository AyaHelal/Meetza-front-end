import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Microphone, MicrophoneSlash, Paperclip, PlusCircle, UserCircle } from '@phosphor-icons/react';
import './MeetingRightSidebar.css';
import api from '../../../API/axiosInstance';
import { smartToast } from '../../../API/toastManager';
import { AuthContext } from '../../../context/AuthContext';
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
    const { user } = React.useContext(AuthContext);
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
        } catch (err) {
            console.error("❌ Error fetching meeting resources:", err);
            setResources([]);
        } finally {
            setLoadingResources(false);
        }
    }, []);

    const isMeetingAdmin = Boolean(
        user?.id && meetingInfo?.administrator_id && String(user.id) === String(meetingInfo.administrator_id)
    );
    const canAddResource = isMeetingAdmin && groupContentId && meetingId;

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
            } catch (err) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to add resource';
                smartToast.error(msg);
            } finally {
                setUploadingResource(false);
                e.target.value = '';
            }
        },
        [groupContentId, meetingId, fetchResources]
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

    // Resolve group_content_id from meeting's group (for admin add resource API)
    useEffect(() => {
        if (!meetingInfo?.group_id) {
            setGroupContentId(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/group');
                const list = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
                const group = list.find((g) => String(g.id) === String(meetingInfo.group_id));
                if (!cancelled) setGroupContentId(group?.group_content_id || null);
            } catch {
                if (!cancelled) setGroupContentId(null);
            }
        })();
        return () => { cancelled = true; };
    }, [meetingInfo?.group_id]);

    // Fetch resources attached to this meeting
    useEffect(() => {
        fetchResources(meetingId);
    }, [fetchResources, meetingId]);

    // Refresh meeting details and resources periodically so members see new resources
    useEffect(() => {
        if (!meetingId) return;

        const refresh = () => {
            const mid = meetingIdRef.current;
            if (!mid) return;
            fetchMeetingDetails(mid);
            fetchResources(mid);
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
    }, [fetchMeetingDetails, fetchResources, meetingId]);

    return (
        <div className="meeting-right-sidebar px-2">
            {/* Meeting Description + Resources */}
            <div className="video-description-card">
                <div className="video-description-header">
                    <h3 className="video-description-title fw-semibold">Video Description</h3>
                    {canAddResource && (
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
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingResource}
                                title="Add resource"
                            >
                                <PlusCircle size={20} weight="regular" />
                                {uploadingResource ? 'Uploading...' : 'Add resource'}
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
                                        <MicrophoneSlash size={20} weight="fill" />
                                    ) : (
                                        <Microphone size={20} weight="fill" />
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

