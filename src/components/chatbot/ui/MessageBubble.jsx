import React from "react";

const MessageBubble = ({ text, isBot, isError }) => {
  return (
    <div className={`message-chatbot ${isBot ? "bot-message" : "user-message"} ${isError ? "error-message" : ""}`}>
      {text}
    </div>
  );
};

export default MessageBubble;
