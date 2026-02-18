import React from "react";

const MeetingRoomFloatingEmojis = ({ floatingEmojis }) => {
  return (
    <>
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          className="floating-emoji"
          style={{
            left: `${item.left}px`,
            top: `${item.top}px`,
          }}
        >
          <div className="floating-emoji-char">{item.emoji}</div>
        </div>
      ))}
    </>
  );
};

export default MeetingRoomFloatingEmojis;
