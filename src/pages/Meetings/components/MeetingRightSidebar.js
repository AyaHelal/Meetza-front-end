import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Paperclip, UserCircle } from '@phosphor-icons/react';
import './MeetingRightSidebar.css';
import api from '../../../API/axiosInstance';
import { smartToast } from '../../../API/toastManager';

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

    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);

    useEffect(() => {
        const fetchParticipants = async () => {
            if (!meetingId) return;

            setLoadingParticipants(true);
            try {
                const res = await api.get(`/meeting/${meetingId}/participants`);

                // Support common backend response shapes:
                // - { success, data: [...] }
                // - { data: { success, data: [...] } }
                // - plain array/object
                const root = res?.data;
                const nested = root?.data && (root?.success === undefined) ? root?.data : null;
                const effective = nested || root;
                const payload = effective?.data ?? effective;

                const list =
                    Array.isArray(payload) ? payload :
                        Array.isArray(payload?.participants) ? payload.participants :
                            Array.isArray(payload?.users) ? payload.users :
                                [];

                setParticipants(list);
            } catch (err) {
                console.error("❌ Error fetching meeting participants:", err);
                smartToast.error(
                    err.response?.data?.message || err.message || "Failed to load meeting participants."
                );
                setParticipants([]);
            } finally {
                setLoadingParticipants(false);
            }
        };

        fetchParticipants();
    }, [meetingId]);

    return (
        <div className="meeting-right-sidebar px-2">
            {/* Video Description Card */}
            <div className="video-description-card p-4">
                <div>
                    <h3 className="video-description-title fw-semibold">Video Description</h3>
                    <p className="video-description-subtitle">All about attract not chasing</p>
                </div>

                <div className="video-description-items">
                    <div className="description-item">
                        <Paperclip size={20} weight="regular" className="item-icon" />
                        <span>Lecture 101</span>
                    </div>
                    <div className="description-item">
                        <Paperclip size={20} weight="regular" className="item-icon" />
                        <span>Lecture 101</span>
                    </div>
                </div>

                <p className="video-description-text">
                    Stories we talk about from poem the rider about
                </p>
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
                    ) : loadingParticipants ? (
                        <div className="participant-item">
                            <div className="participant-info">
                                <span className="participant-name fw-semibold">Loading...</span>
                            </div>
                        </div>
                    ) : participants.length === 0 ? (
                        <div className="participant-item">
                            <div className="participant-info">
                                <span className="participant-name fw-semibold">No participants</span>
                            </div>
                        </div>
                    ) : participants.map((participant, index) => (
                        <div key={participant?.id || index} className="participant-item">
                            <div className="participant-avatar">
                                {participant?.member_photo ? (
                                    <img
                                        src={participant.member_photo}
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

