import React from "react";

const MeetingRoomSliderDots = ({ activeSlide, setActiveSlide, isAdmin = false }) => {
  const slides = isAdmin ? [0, 1] : [0, 1, 2];
  return (
    <div className="meeting-room-dots">
      {slides.map((i) => (
        <button
          key={i}
          type="button"
          className={`meeting-room-dot ${activeSlide === i ? "active" : ""}`}
          onClick={() => setActiveSlide(i)}
          aria-label={`View ${i === 0 ? (isAdmin ? "members" : "members") : i === 1 ? (isAdmin ? "you" : "you") : "screen"}`}
        />
      ))}
    </div>
  );
};

export default MeetingRoomSliderDots;
