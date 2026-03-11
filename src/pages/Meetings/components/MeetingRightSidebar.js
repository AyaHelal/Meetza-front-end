import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Microphone, MicrophoneSlash, Paperclip, PlusCircle, Trash, UserCircle } from '@phosphor-icons/react';
import './MeetingRightSidebar.css';
import api from '../../../API/axiosInstance';
import { smartToast } from '../../../API/toastManager';
import { AuthContext } from '../../../context/AuthContext';
import { useMeetingContext } from '../../../context/MeetingContext';
import { useSocket } from '../../../context/SocketContext';
import { useMediaContext } from '../../../context/MediaContext';
import { ConfirmDeleteModal } from '../../../components/shared/ConfirmDeleteModal';

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
    // Always rely on auth user coming from token (no user object in storage)
    const authUser = React.useContext(AuthContext)?.user;
    const { socket } = useSocket();
    const { participants: socketParticipants, hasJoined, meetingId: contextMeetingId, localParticipantAudioMuted, setLocalParticipantAudioMuted, mediaStateMap } = useMeetingContext();
    const { getPeerConnections, audioMuted: myAudioMuted } = useMediaContext();

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
    const [showDeleteResourceModal, setShowDeleteResourceModal] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState(null);
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
            const contentId =
                root?.group_content_id ??
                root?.data?.group_content_id ??
                payload[0]?.group_content_id ??
                null;
            setGroupContentId(contentId);
        } catch (err) {
            console.error("❌ Error fetching meeting resources:", err);
            setResources([]);
        } finally {
            setLoadingResources(false);
        }
    }, []);

    const currentUserId = authUser?.id ?? authUser?.user_id ?? null;
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

    const handleDeleteResourceClick = useCallback((resourceId) => {
        if (!resourceId) return;
        setResourceToDelete(resourceId);
        setShowDeleteResourceModal(true);
    }, []);

    const confirmDeleteResource = useCallback(
        async () => {
            if (!groupContentId || !meetingId || !resourceToDelete) return;
            setDeletingResourceId(resourceToDelete);
            try {
                await api.delete(`/group-contents/${groupContentId}/files/${resourceToDelete}`);
                smartToast.success('Resource removed.');
                setShowDeleteResourceModal(false);
                setResourceToDelete(null);
                await fetchResources(meetingId);
                if (socket) socket.emit('meetingResourceAdded', { meetingId });
            } catch (err) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to delete resource';
                smartToast.error(msg);
                setShowDeleteResourceModal(false);
                setResourceToDelete(null);
            } finally {
                setDeletingResourceId(null);
            }
        },
        [groupContentId, meetingId, resourceToDelete, fetchResources, socket]
    );

    const closeDeleteResourceModal = useCallback(() => {
        if (deletingResourceId) return;
        setShowDeleteResourceModal(false);
        setResourceToDelete(null);
    }, [deletingResourceId]);

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

    // Handler to mute/unmute a participant — tells the participant to mute their mic (real mute at their side)
    const handleAdminMuteParticipant = useCallback((participantSocketId, shouldMute) => {
        if (!participantSocketId) return;
        setLocalParticipantAudioMuted((prev) => ({ ...prev, [participantSocketId]: shouldMute }));
        if (socket && meetingId) {
            socket.emit("adminMuteParticipant", {
                meetingId,
                targetSocketId: participantSocketId,
                muted: shouldMute,
            });
        }
    }, [socket, meetingId, setLocalParticipantAudioMuted]);

    // Fetch meeting details to get description + group_id for admin add-resource
    useEffect(() => {
        fetchMeetingDetails(meetingId);
    }, [fetchMeetingDetails, meetingId]);

    // group_content_id comes from GET /group-contents/meeting/:id response (set in fetchResources)

    // Fetch resources attached to this meeting (also sets group_content_id from API for add-resource)
    useEffect(() => {
        fetchResources(meetingId);
    }, [fetchResources, meetingId]);

    // Fallback: if group_content_id not from resources API (e.g. zero resources), get it from group info so admin can add resources
    useEffect(() => {
        if (!meetingInfo?.group_id || groupContentId != null) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get(`/chat/groups/${meetingInfo.group_id}/info`);
                const contentId = res?.data?.data?.content?.id ?? res?.data?.content?.id ?? null;
                if (!cancelled && contentId) setGroupContentId(contentId);
            } catch (_) {
                // ignore; group_content_id may still come from fetchResources
            }
        })();
        return () => { cancelled = true; };
    }, [meetingInfo?.group_id, groupContentId]);

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
                                            onClick={() => handleDeleteResourceClick(resItem.id)}
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
                        const isSelf = socketId === socket?.id;
                        const participantMicMuted = isSelf ? myAudioMuted : (socketId ? !!(mediaStateMap[socketId]?.audioMuted) : true);
                        const showMuteBtn = isMeetingAdmin && !isAdmin && socketId;

                        const displayName = isSelf
                            ? (authUser?.name || getParticipantDisplayName(participant, index))
                            : getParticipantDisplayName(participant, index);

                        const photo = isSelf
                            ? (authUser?.user_photo || authUser?.photo)
                            : (participant?.member_photo || participant?.memberPhoto || participant?.user_photo);
                        const photoSrc = (typeof photo === "string" && photo.trim()) ? photo.trim() : null;

                        return (
                            <div
                                key={participant?.socketId || participant?.member_id || participant?.id || index}
                                className={`participant-item ${isAdmin ? 'participant-item--admin-pinned' : ''}`}
                            >
                                <div className="participant-avatar">
                                    {photoSrc ? (
                                        <img
                                            src={photoSrc}
                                            alt={displayName}
                                            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <UserCircle size={40} weight="fill" />
                                    )}
                                </div>
                                <div className="participant-info">
                                    <span className="participant-name fw-semibold">
                                        {displayName}
                                    </span>
                                    <div className="participant-status-row">
                                        <span className={`participant-status ${getParticipantStatusLabel(participant).toLowerCase()}`}>
                                            {getParticipantStatusLabel(participant)}
                                        </span>
                                        {isAdmin ? (
                                            <span className="participant-badge-admin">Admin</span>
                                        ) : (
                                            showMuteBtn ? (
                                                <button
                                                    type="button"
                                                    className="participant-mute-btn"
                                                    onClick={() => handleAdminMuteParticipant(socketId, !participantMicMuted)}
                                                    title={participantMicMuted ? 'Unmute' : 'Mute'}
                                                    aria-label={participantMicMuted ? 'Unmute' : 'Mute'}
                                                >
                                                    {participantMicMuted ? (
                                                        <MicrophoneSlash size={20} weight="regular" />
                                                    ) : (
                                                        <Microphone size={20} weight="regular" />
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="participant-mute-indicator" aria-hidden="true">
                                                    {participantMicMuted ? (
                                                        <MicrophoneSlash size={20} weight="regular" />
                                                    ) : (
                                                        <Microphone size={20} weight="regular" />
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmDeleteModal
                show={showDeleteResourceModal}
                onClose={closeDeleteResourceModal}
                onConfirm={confirmDeleteResource}
                title="Delete Resource"
                message="Are you sure you want to delete this resource? This action cannot be undone."
                confirming={!!deletingResourceId}
            />
        </div>
    );
};

export default MeetingRightSidebar;

