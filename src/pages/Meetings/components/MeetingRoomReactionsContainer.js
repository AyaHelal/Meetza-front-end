import React from "react";

const MeetingRoomReactionsContainer = ({ reactionsMap, getReactionIcon }) => {
  const allReactions = [];
  Object.entries(reactionsMap).forEach(([memberKey, reactionEntry]) => {
    Object.entries(reactionEntry).forEach(([type, data]) => {
      const name = typeof data === "string" ? data : data.name;
      const timestamp = typeof data === "string" ? 0 : data.timestamp || 0;
      allReactions.push({ memberKey, type, name, timestamp });
    });
  });
  const recentReactions = allReactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 2)
    .reverse();

  return (
    <div className="meeting-room-reactions-container">
      {recentReactions.map((reaction) => (
        <div
          key={`${reaction.memberKey}-${reaction.type}-${reaction.timestamp}`}
          className="meeting-room-reaction-item"
        >
          <div className="reaction-icon-small">{getReactionIcon(reaction.type)}</div>
          <div className="reaction-name-text">Emoji by {reaction.name}</div>
        </div>
      ))}
    </div>
  );
};

export default MeetingRoomReactionsContainer;
