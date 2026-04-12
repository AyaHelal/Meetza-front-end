import React from "react";
import MessageItem from "./MessageItem";

export default function MainChatMessageList({
  loading,
  showExpanded,
  expandedContent,
  groupId,
  messages,
  messagesEndRef,
  onDeleteMessage,
  onEditMessage,
  currentUserEmail,
  onMediaClick,
  userRole,
  onReply,
  onReact,
}) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  if (showExpanded) {
    return expandedContent;
  }

  if (!groupId) {
    return (
      <>
        <div className="no-messages-container">
          <img src="/assets/GroupChat.png" alt="No chat selected" className="no-messages-image" />
          <p className="no-messages-text fw-semibold mt-3">No chats selected yet!</p>
        </div>
        <p style={{ color: "#888888", textAlign: "center", marginTop: "auto", padding: "1rem" }}>
          Select chat to start a conversation
        </p>
      </>
    );
  }

  if (!messages.length) {
    return (
      <div className="no-messages-container">
        <img src="/assets/GroupChat.png" alt="No messages" className="no-messages-image" />
      </div>
    );
  }

  return (
    <>
      {Array.isArray(messages) && messages.length > 0 ? (
        messages.map((msg, index) => {
          const msgDate =
            msg.date ||
            new Date(msg.created_at || Date.now()).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          const prevDate =
            index > 0
              ? messages[index - 1].date ||
              new Date(messages[index - 1].created_at || Date.now()).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
              : null;
          const showSeparator = index === 0 || prevDate !== msgDate;
          return (
            <React.Fragment key={msg.id || `msg-${index}`}>
              {showSeparator && (
                <div className="date-separator-wrapper">
                  <div className="date-separator">{msgDate}</div>
                </div>
              )}
              <MessageItem
                message={msg}
                onDeleteMessage={onDeleteMessage}
                onEditMessage={onEditMessage}
                currentUserEmail={currentUserEmail}
                onMediaClick={onMediaClick}
                userRole={userRole}
                onReply={onReply}
                onReact={onReact}
              />
            </React.Fragment>
          );
        })
      ) : (
        <div className="no-messages-container">
          <img src="/assets/GroupChat.png" alt="No messages" className="no-messages-image" />
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );
}
