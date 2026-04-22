import React, { useEffect, useState } from "react";
import api from "../../../API/axiosInstance";
import { buildFileUrl } from "../../VideoSessions/services";
import { VideoCamera } from "@phosphor-icons/react";
import "./OutgoingMeetingCard.css";

export function OutgoingMeetingCard({ meeting, onJoin }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchParticipants = async () => {
      try {
        const res = await api.get(`/meeting/${meeting.id}/participants`);
        if (!cancelled) {
          const list = Array.isArray(res.data?.data) ? res.data.data : [];
          setParticipants(list);
        }
      } catch (err) {
        console.error("Failed to fetch participants for meeting", meeting.id, err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchParticipants();
    return () => {
      cancelled = true;
    };
  }, [meeting.id]);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const maxAvatars = 3;
  const displayParticipants = participants.slice(0, maxAvatars);
  const remainingCount = participants.length - maxAvatars;

  return (
    <div className="outgoing-meeting-card">
      <div className="outgoing-meeting-card__poster">
        {meeting.posterUrl ? (
          <img 
            src={buildFileUrl(meeting.posterUrl)} 
            alt={meeting.meetingTitle} 
            className="outgoing-meeting-card__img"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="outgoing-meeting-card__default-thumb">
            <VideoCamera size={32} weight="fill" />
          </div>
        )}
        <div className="outgoing-meeting-card__badge">LIVE</div>
      </div>
      <div className="outgoing-meeting-card__content">
        <h3 className="outgoing-meeting-card__title">{meeting.meetingTitle}</h3>
        <div className="outgoing-meeting-card__info">
          Online • {formatTime(meeting.startAt)} → {formatTime(meeting.endAt)}
        </div>
        <div className="outgoing-meeting-card__participants">
          {displayParticipants.map((p, idx) => (
            <div key={p.id || idx} className="outgoing-participant-avatar" title={p.member_name || p.name || p.full_name}>
              {(p.member_photo || p.user_photo || p.photo) ? (
                <img src={buildFileUrl(p.member_photo || p.user_photo || p.photo)} alt={p.member_name || p.name} />
              ) : (
                <span>{getInitials(p.member_name || p.name || p.full_name || p.username)}</span>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="outgoing-participant-avatar outgoing-participant-avatar--more">
              +{remainingCount}
            </div>
          )}
        </div>
        <button 
          type="button" 
          className="outgoing-meeting-card__btn" 
          onClick={() => onJoin(meeting.id)}
        >
          Click to open full video
        </button>
      </div>
    </div>
  );
}
