import React, { useState, useEffect, useRef } from "react";
import "./chatbot.css";

export default function RobotOrb({ onClick }) {
  // Use right and bottom offsets to stay anchored to the corner on resize
  const [position, setPosition] = useState({ 
    right: window.innerWidth <= 768 ? 20 : 20, 
    bottom: window.innerWidth <= 768 ? 50 : 100 
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ right: 0, bottom: 0 });
  const containerRef = useRef(null);
  const hasMoved = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newRight = window.innerWidth - e.clientX - dragStartOffset.current.right;
      const newBottom = window.innerHeight - e.clientY - dragStartOffset.current.bottom;

      // Boundary checks (width/height of container is ~120px)
      const orbSize = window.innerWidth <= 768 ? 90 : 120;
      const boundedRight = Math.min(Math.max(0, newRight), window.innerWidth - orbSize);
      const boundedBottom = Math.min(Math.max(0, newBottom), window.innerHeight - orbSize);

      hasMoved.current = true;
      setPosition({ right: boundedRight, bottom: boundedBottom });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];

      const newRight = window.innerWidth - touch.clientX - dragStartOffset.current.right;
      const newBottom = window.innerHeight - touch.clientY - dragStartOffset.current.bottom;

      const orbSize = window.innerWidth <= 768 ? 90 : 120;
      const boundedRight = Math.min(Math.max(0, newRight), window.innerWidth - orbSize);
      const boundedBottom = Math.min(Math.max(0, newBottom), window.innerHeight - orbSize);

      hasMoved.current = true;
      setPosition({ right: boundedRight, bottom: boundedBottom });
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
  }, [isDragging]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartOffset.current = {
      right: window.innerWidth - e.clientX - position.right,
      bottom: window.innerHeight - e.clientY - position.bottom,
    };
    document.body.style.userSelect = "none";
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    hasMoved.current = false;
    const touch = e.touches[0];
    dragStartOffset.current = {
      right: window.innerWidth - touch.clientX - position.right,
      bottom: window.innerHeight - touch.clientY - position.bottom,
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
        right: `${position.right}px`,
        bottom: `${position.bottom}px`,
        top: 'auto',
        left: 'auto'
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
