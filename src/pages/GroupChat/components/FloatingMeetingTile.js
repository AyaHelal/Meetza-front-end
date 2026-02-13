import React, { useEffect, useState, useRef } from "react";
import { VideoCamera } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import "./FloatingMeetingTile.css";

const FloatingMeetingTile = () => {
  const navigate = useNavigate();
  const [activeMeetingId, setActiveMeetingId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const tileRef = useRef(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });

  useEffect(() => {
    const sync = () => {
      try {
        const mid = sessionStorage.getItem("activeMeetingId");
        const gid = sessionStorage.getItem("activeMeetingGroupId");
        setActiveMeetingId(mid || null);
        setActiveGroupId(gid || null);
      } catch {
        setActiveMeetingId(null);
        setActiveGroupId(null);
      }
    };
    sync();
    const interval = setInterval(sync, 500);
    return () => clearInterval(interval);
  }, []);

  const handleReturnToMeeting = (e) => {
    if (dragRef.current.isDragging) return;
    if (!activeMeetingId) return;
    navigate("/meetings", {
      state: { meetingId: activeMeetingId, groupId: activeGroupId || null },
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current.isDragging = false;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    const el = tileRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      dragRef.current.startLeft = rect.left;
      dragRef.current.startTop = rect.top;
    }
  };

  const handleMouseMove = (e) => {
    if (e.buttons !== 1) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 5 || dy > 5) dragRef.current.isDragging = true;

    if (dragRef.current.isDragging && tileRef.current) {
      const el = tileRef.current;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      const newLeft = dragRef.current.startLeft + deltaX;
      const newTop = dragRef.current.startTop + deltaY;
      el.style.left = `${Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newLeft))}px`;
      el.style.top = `${Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newTop))}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
    }
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
  };

  useEffect(() => {
    if (!activeMeetingId) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeMeetingId]);

  if (!activeMeetingId) return null;

  return (
    <button
      ref={tileRef}
      type="button"
      className="floating-meeting-tile"
      onClick={handleReturnToMeeting}
      onMouseDown={handleMouseDown}
      aria-label="Return to meeting"
    >
      <div className="floating-meeting-icon">
        <VideoCamera size={22} weight="fill" />
      </div>
      <div className="floating-meeting-text">
        <span className="floating-meeting-title">Return to meeting</span>
        <span className="floating-meeting-sub">Tap to go back</span>
      </div>
    </button>
  );
};

export default FloatingMeetingTile;
