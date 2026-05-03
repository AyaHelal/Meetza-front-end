const MeetingRoomSliderViewport = ({
  sliderViewportRef,
  activeSlide,
  slide0,
  slide1,
  slide2,
  floatingEmojis,
  isAdmin = false,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  return (
    <div
      className="meeting-room-slider-viewport"
      ref={sliderViewportRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overflow: "hidden" }}
    >
      <div
        className={`meeting-room-slider-track ${activeSlide === 1 ? "single-view" : ""} ${isAdmin ? "admin-layout" : ""}`}
        style={{
          display: "flex",
          transform: `translateX(-${activeSlide * 100}%)`,
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          width: "100%" /* Track is a flex container, children will expand it */
        }}
      >
        <div className="meeting-room-slide slide-0" style={{ flex: "0 0 100%", width: "100%" }}>{slide0}</div>
        <div className="meeting-room-slide slide-1" style={{ flex: "0 0 100%", width: "100%" }}>{slide1}</div>
        {!isAdmin && (
          <div className="meeting-room-slide slide-2" style={{ flex: "0 0 100%", width: "100%" }}>{slide2}</div>
        )}
      </div>
      {floatingEmojis}
    </div>
  );
};

export default MeetingRoomSliderViewport;
