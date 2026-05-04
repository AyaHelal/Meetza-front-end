import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

const MessageBubble = ({ text, isBot, isError }) => {
  const getMessageHtml = (content) => {
    // Basic marked parsing
    const rawHtml = marked.parse(content, { breaks: true });
    // Sanitize the HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    return { __html: sanitizedHtml };
  };

  return (
    <div className={`message-chatbot ${isBot ? "bot-message" : "user-message"} ${isError ? "error-message" : ""}`}>
      {isBot ? (
        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={getMessageHtml(text)} 
        />
      ) : (
        text
      )}
    </div>
  );
};

export default MessageBubble;

