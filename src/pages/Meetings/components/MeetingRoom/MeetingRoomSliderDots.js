import React from "react";

const MeetingRoomSliderDots = ({ activeSlide, setActiveSlide }) => {
  return (
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
  );
};

export default MeetingRoomSliderDots;
