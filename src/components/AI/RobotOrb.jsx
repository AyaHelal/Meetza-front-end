import React, { useState, useEffect, useRef } from "react";

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
  }, [isDragging]);

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
    <>
      <style>{`
        .robot-orb-container {
          position: fixed;
          width: 120px;
          height: 120px;
          cursor: grab;
          z-index: 1000;
          transition: transform 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: none;
        }
        .robot-orb-container:active {
          cursor: grabbing;
        }
        .robot-orb-container:hover {
          transform: scale(1.05);
        }
        .scene{position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center; transform: scale(0.6);}
        .ring-outer{position:absolute;width:190px;height:190px;border-radius:50%;border:2px solid rgba(0,118,234,.25);box-shadow:0 0 30px rgba(0,118,234,.15),inset 0 0 30px rgba(0,118,234,.05);animation:spinSlow 12s linear infinite;}
        .ring-outer::before{content:'';position:absolute;inset:-8px;border-radius:50%;border:1.5px solid transparent;border-top-color:rgba(0,118,234,.8);border-right-color:rgba(0,118,234,.4);filter:drop-shadow(0 0 8px #0076EA);animation:spinSlow 12s linear infinite;}
        .ring-inner{position:absolute;width:150px;height:150px;border-radius:50%;border:1.5px solid rgba(0,118,234,.2);animation:spinSlow 8s linear infinite reverse;}
        .ring-inner::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:1.5px solid transparent;border-bottom-color:rgba(51,149,255,.9);border-left-color:rgba(51,149,255,.3);filter:drop-shadow(0 0 6px #3395ff);animation:spinSlow 8s linear infinite reverse;}
        .platform{position:absolute;bottom:24px;width:70px;height:14px;background:radial-gradient(ellipse,rgba(51,149,255,.5) 0%,rgba(0,118,234,.2) 50%,transparent 80%);border-radius:50%;filter:blur(2px);}
        .platform-top{position:absolute;bottom:30px;width:55px;height:12px;background:linear-gradient(180deg,rgba(128,187,255,.6),rgba(51,149,255,.3));border-radius:50%;box-shadow:0 0 20px rgba(51,149,255,.6),0 0 40px rgba(0,118,234,.3);}
        .glow-base{position:absolute;bottom:10px;width:120px;height:24px;background:radial-gradient(ellipse,rgba(0,118,234,.4) 0%,transparent 70%);filter:blur(8px);animation:glowPulse 2s ease-in-out infinite;}
        .robot-tooltip {
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          z-index: 20;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .robot-orb-container:hover .robot-tooltip {
          opacity: 1;
          visibility: visible;
          top: -15px;
        }
        .robot-tooltip::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #1e293b;
        }
        .robot{position:absolute;bottom:-30px;width:180px;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:hover 3s ease-in-out infinite; background: radial-gradient(circle, rgba(147,197,253,0.5) 0%, rgba(96,165,250,0.3) 60%, transparent 80%); border-radius: 50%;}
        .r-head{width:46px;height:46px;background:linear-gradient(145deg,#f0f7ff,#e0efff,#cce4ff);border-radius:50%;position:relative;box-shadow:0 4px 20px rgba(0,0,0,.2),inset 0 -4px 10px rgba(0,0,0,.1),inset 0 4px 8px rgba(255,255,255,.8);}
        .r-visor{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:32px;height:18px;background:rgba(15,23,42,.85);border-radius:9px;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:inset 0 2px 4px rgba(0,0,0,.5);}
        .r-eye{width:9px;height:9px;border-radius:50%;background:#1a1a2e;position:relative;}
        .r-eye::after{content:'';width:3px;height:3px;border-radius:50%;background:#a78bfa;position:absolute;top:1px;left:1px;box-shadow:0 0 4px #a78bfa;}
        .r-mouth{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:16px;height:5px;border-radius:0 0 8px 8px;background:rgba(15,23,42,.5);}
        .r-helmet-rim{position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:50px;height:7px;background:linear-gradient(180deg,#cce4ff,#80bbff);border-radius:4px;}
        .r-neck{width:14px;height:7px;background:linear-gradient(180deg,#cce4ff,#80bbff);border-radius:3px;}
        .r-body{width:50px;height:56px;background:linear-gradient(145deg,#f0f7ff,#e0efff,#cce4ff);border-radius:25px 25px 20px 20px;position:relative;box-shadow:0 6px 20px rgba(0,0,0,.2),inset 0 -6px 12px rgba(0,0,0,.1),inset 0 6px 10px rgba(255,255,255,.7);}
        .r-gem{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#c4b5fd,#7c3aed);box-shadow:0 0 10px #a78bfa,0 0 20px rgba(167,139,250,.5);animation:gemPulse 2s ease-in-out infinite;}
        .r-belly{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:24px;height:14px;background:rgba(255,255,255,.3);border-radius:7px;}
        .r-arms{position:absolute;top:0;width:100%;display:flex;justify-content:space-between;}
        .r-arm{width:12px;height:40px;background:linear-gradient(145deg,#f0f7ff,#cce4ff);border-radius:6px;position:relative;box-shadow:0 3px 8px rgba(0,0,0,.15);}
        .r-arm.l{margin-left:-9px;transform-origin:top center;animation:armSwayL 3s ease-in-out infinite;}
        .r-arm.r{margin-right:-9px;transform-origin:top center;animation:armSwayR 3s ease-in-out infinite;}
        .r-hand{width:14px;height:10px;background:linear-gradient(145deg,#e0efff,#cce4ff);border-radius:7px;position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);}
        .r-legs{display:flex;gap:5px;margin-top:-2px;}
        .r-leg{width:14px;height:20px;background:linear-gradient(145deg,#e0efff,#cce4ff);border-radius:7px 7px 5px 5px;position:relative;}
        .r-foot{width:18px;height:9px;background:linear-gradient(145deg,#cce4ff,#80bbff);border-radius:4px 4px 7px 7px;position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);}
        .i-float{position:absolute;width:32px;height:32px;background:linear-gradient(135deg,rgba(0,118,234,.3),rgba(0,118,234,.15));border:1px solid rgba(51,149,255,.5);border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(0,118,234,.2);}
        .i-float svg{width:16px;height:16px;}
        .i1{top:38px;left:8px;animation:floatIcon 3s ease-in-out infinite;}
        .i2{top:28px;right:10px;animation:floatIcon 3s ease-in-out infinite .5s;}
        .i3{top:90px;left:4px;animation:floatIcon 3s ease-in-out infinite 1s;}
        .i4{top:94px;right:6px;animation:floatIcon 3s ease-in-out infinite 1.5s;}
        .scanline{position:absolute;width:140px;height:1px;background:linear-gradient(90deg,transparent,rgba(51,149,255,.4),transparent);animation:scan 4s linear infinite;}
        @keyframes spinSlow{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes hover{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
        @keyframes armSwayL{0%,100%{transform:rotate(-8deg);}50%{transform:rotate(8deg);}}
        @keyframes armSwayR{0%,100%{transform:rotate(8deg);}50%{transform:rotate(-8deg);}}
        @keyframes floatIcon{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
        @keyframes gemPulse{0%,100%{box-shadow:0 0 10px #a78bfa,0 0 20px rgba(167,139,250,.5);}50%{box-shadow:0 0 18px #a78bfa,0 0 35px rgba(167,139,250,.8);}}
        @keyframes glowPulse{0%,100%{opacity:.6;}50%{opacity:1;}}
        @keyframes scan{0%{top:15%;opacity:0;}20%{opacity:1;}80%{opacity:1;}100%{top:85%;opacity:0;}}
      `}</style>

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
    </>
  );
}
