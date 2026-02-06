import React, { useState } from "react";
import {
  Microphone,
  VideoCamera,
  HandWaving,
  ImageSquare  ,
  Smiley,
  ChatCircleDots ,
  SignOut,
  ArrowUp ,
} from "@phosphor-icons/react";
import "./MeetingRoom.css";

// Placeholder participants for design (first = You, second = Admin, rest = members)
const PLACEHOLDER_MEMBERS = [
  { id: "you", label: "You", isAdmin: false },
  { id: "admin", label: "Admin", isAdmin: true },
  { id: "2", label: null, isAdmin: false },
  { id: "3", label: null, isAdmin: false },
  { id: "4", label: null, isAdmin: false },
  { id: "5", label: null, isAdmin: false },
  { id: "6", label: null, isAdmin: false },
  { id: "7", label: null, isAdmin: false },
];

const MeetingRoom = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);

  return (
    <div className="meeting-room">
      {/* Header */}
      <div className="meeting-room-header">
        <div className="meeting-room-title-wrap">
          <h1 className="meeting-room-title">Meeting room</h1>
          <p className="meeting-room-subtitle">Group Meeting name</p>
        </div>
        <button type="button" className="meeting-room-expand-btn" aria-label="Expand">
          <SignOut size={20} weight="bold" />
        </button>
      </div>

      <div className="meeting-room-slider-viewport">
        <div
          className={`meeting-room-slider-track ${activeSlide === 1 ? 'single-view' : ''}`}
          style={{ transform: `translateX(-${activeSlide * (100 / 3)}%)` }}
        >
          <div className="meeting-room-slide">
            <div className="meeting-room-grid">
              {PLACEHOLDER_MEMBERS.map((m) => (
                <div key={m.id} className="meeting-room-tile">
                  <div className="meeting-room-tile-avatar">
                    <span className="meeting-room-tile-initial">
                      {m.label === "You" ? "U" : m.label === "Admin" ? "A" : "M"}
                    </span>
                  </div>
                  {(m.label === "You" || m.label === "Admin") && (
                    <span className={`meeting-room-tile-badge ${m.isAdmin ? "admin" : "you"}`}>
                      {m.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="meeting-room-slide">
            <div className="meeting-room-single">
              <div className="meeting-room-tile-large">
                <div className="meeting-room-tile-avatar large">
                  <span className="meeting-room-tile-initial">U</span>
                </div>
                <span className="meeting-room-tile-badge you">You</span>
              </div>
            </div>
          </div>

          <div className="meeting-room-slide">
            <div className="meeting-room-screen">
              <div className="meeting-room-screen-preview">
                <div className="meeting-room-screen-placeholder" />
              </div>
              <span className="meeting-room-tile-badge admin">Admin screen</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slider dots */}
      <div className="meeting-room-dots">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            className={`meeting-room-dot ${activeSlide === i ? "active" : ""}`}
            onClick={() => setActiveSlide(i)}
            aria-label={`View ${i === 0 ? "members" : i === 1 ? "you" : "screen"}`}
          />
        ))}
      </div>

      {/* Control bar */}
      <div className={`meeting-room-control-bar ${showCommentInput ? 'has-input' : ''}`}>
        <div className="meeting-room-controls">
          <button type="button" className="meeting-room-control-btn" aria-label="Microphone">
            <Microphone size={22} weight="regular" />
          </button>
          <button type="button" className="meeting-room-control-btn" aria-label="Raise hand">
            <HandWaving size={22} weight="regular" />
          </button>
          <button type="button" className="meeting-room-control-btn active" aria-label="Camera">
            <VideoCamera size={22} weight="regular" />
          </button>
          <button type="button" className="meeting-room-control-btn" aria-label="Share screen">
            <ImageSquare   size={22} weight="regular" />
          </button>
          <button type="button" className="meeting-room-control-btn" aria-label="Reactions">
            <Smiley size={22} weight="regular" />
          </button>
          <button type="button" className="meeting-room-control-btn" aria-label="Chat" onClick={() => setShowCommentInput(true)}>
            <ChatCircleDots  size={22} weight="regular" />
          </button>
        </div>
        {showCommentInput && (
          <div className="meeting-room-comment-wrapper">
            <input
              type="text"
              placeholder="Type a Comment..."
              className="meeting-room-comment-input visible"
              autoFocus
              onBlur={() => setShowCommentInput(false)}
            />
            <button
              type="button"
              className="meeting-room-comment-send-btn"
              aria-label="Send comment"
            >
              <ArrowUp  size={18} weight="regular" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingRoom;
