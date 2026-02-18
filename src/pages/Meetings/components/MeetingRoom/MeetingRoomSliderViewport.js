import React from "react";

const MeetingRoomSliderViewport = ({
  sliderViewportRef,
  activeSlide,
  slide0,
  slide1,
  slide2,
  floatingEmojis,
}) => {
  return (
    <div className="meeting-room-slider-viewport" ref={sliderViewportRef}>
      <div
        className={`meeting-room-slider-track ${activeSlide === 1 ? "single-view" : ""}`}
        style={{ transform: `translateX(-${activeSlide * (100 / 3)}%)` }}
      >
        <div className="meeting-room-slide">{slide0}</div>
        <div className="meeting-room-slide">{slide1}</div>
        <div className="meeting-room-slide">{slide2}</div>
      </div>
      {floatingEmojis}
    </div>
  );
};

export default MeetingRoomSliderViewport;
