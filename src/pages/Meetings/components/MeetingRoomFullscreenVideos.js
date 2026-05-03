import React from "react";

const MeetingRoomFullscreenVideos = ({
  screenShareFullscreenRef,
  screenShareVideoRef,
  memberVideoFullscreenRef,
  memberVideoVideoRef,
}) => {
  return (
    <>
      {/* Dedicated fullscreen video for remote screen share - set srcObject before fullscreen to avoid black screen */}
      <div
        ref={screenShareFullscreenRef}
        className="meeting-room-fullscreen-video"
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", pointerEvents: "none", visibility: "hidden" }}
      >
        <video
          ref={screenShareVideoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Dedicated fullscreen video for remote member videos */}
      <div
        ref={memberVideoFullscreenRef}
        className="meeting-room-fullscreen-video"
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", pointerEvents: "none", visibility: "hidden" }}
      >
        <video
          ref={memberVideoVideoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </>
  );
};

export default MeetingRoomFullscreenVideos;
