import React from "react";

const MeetingRoomSliderViewport = ({
  sliderViewportRef,
  activeSlide,
  slide0,
  slide1,
  slide2,
  floatingEmojis,
  isAdmin = false,
}) => {
  const slideCount = isAdmin ? 2 : 3;
  const slideWidth = 100 / slideCount;

  return (
    <div className="meeting-room-slider-viewport" ref={sliderViewportRef}>
      <div
        className={`meeting-room-slider-track ${activeSlide === 1 ? "single-view" : ""} ${isAdmin ? "admin-layout" : ""}`}
        style={{
          transform: `translateX(-${activeSlide * slideWidth}%)`,
          width: `${slideCount * 100}%`
        }}
      >
        <div className={`meeting-room-slide ${isAdmin ? "admin-slide" : ""}`} style={{ width: `${slideWidth}%`, flex: `0 0 ${slideWidth}%` }}>{slide0}</div>
        <div className={`meeting-room-slide ${isAdmin ? "admin-slide" : ""}`} style={{ width: `${slideWidth}%`, flex: `0 0 ${slideWidth}%` }}>{slide1}</div>
        {!isAdmin && <div className="meeting-room-slide" style={{ width: `${slideWidth}%`, flex: `0 0 ${slideWidth}%` }}>{slide2}</div>}
      </div>
      {floatingEmojis}
    </div>
  );
};

export default MeetingRoomSliderViewport;
