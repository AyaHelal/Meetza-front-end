import React, { useState, useEffect, useRef } from "react";
import "./chatbot.css";

export default function RobotOrb({ onClick }) {
  const [position, setPosition] = useState({ x: window.innerWidth - 140, y: window.innerHeight - 220 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const hasMoved = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;

      // Boundary checks
      const boundedX = Math.min(Math.max(0, newX), window.innerWidth - 120);
      const boundedY = Math.min(Math.max(0, newY), window.innerHeight - 120);

      if (Math.abs(e.clientX - (dragStartPos.current.x + position.x)) > 5 ||
        Math.abs(e.clientY - (dragStartPos.current.y + position.y)) > 5) {
        hasMoved.current = true;
      }

      setPosition({ x: boundedX, y: boundedY });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];

      const newX = touch.clientX - dragStartPos.current.x;
      const newY = touch.clientY - dragStartPos.current.y;

      const boundedX = Math.min(Math.max(0, newX), window.innerWidth - 120);
      const boundedY = Math.min(Math.max(0, newY), window.innerHeight - 120);

      hasMoved.current = true;
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, position.x, position.y]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = "none";
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    hasMoved.current = false;
    const touch = e.touches[0];
    dragStartPos.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  const handleClick = (e) => {
    if (!hasMoved.current) {
      onClick();
    }
  };

  return (
    <div
      ref={containerRef}
      className="robot-orb-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      <div className="scene">
        <div className="ring-outer"></div>
        <div className="ring-inner"></div>
        <div className="scanline"></div>
        <div className="platform"></div>
        <div className="platform-top"></div>
        <div className="glow-base"></div>

        {/* Floating icons */}
        <div className="i-float i1">
          <svg fill="none" stroke="#3395ff" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="i-float i2">
          <svg fill="none" stroke="#3395ff" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <div className="i-float i3">
          <svg fill="none" stroke="#3395ff" strokeWidth="1.8" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21 5,3" />
          </svg>
        </div>
        <div className="i-float i4">
          <svg fill="none" stroke="#3395ff" strokeWidth="1.8" viewBox="0 0 24 24">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>

        {/* Robot */}
        <div className="robot">
          <div className="robot-tooltip">
            <span style={{ fontSize: "16px" }}>👋</span> Need help?
          </div>
          <div className="r-head">
            <div className="r-visor">
              <div className="r-eye"></div>
              <div className="r-eye"></div>
            </div>
            <div className="r-mouth"></div>
            <div className="r-helmet-rim"></div>
          </div>
          <div className="r-neck"></div>
          <div className="r-body">
            <div className="r-arms">
              <div className="r-arm l"><div className="r-hand"></div></div>
              <div className="r-arm r"><div className="r-hand"></div></div>
            </div>
            <div className="r-gem"></div>
            <div className="r-belly"></div>
          </div>
          <div className="r-legs">
            <div className="r-leg"><div className="r-foot"></div></div>
            <div className="r-leg"><div className="r-foot"></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
