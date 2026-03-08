import React from "react";
import { ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react";

export default function MainChatHeader({
  isMobile,
  showMainChat,
  activeSection,
  expandedSection,
  onCloseSection,
  setExpandedSection,
  onBackToChats,
  chatTitle,
  groupId,
  onGroupNameClick,
  showCreateMeetingButton,
  showJoinMeetingButton,
  isInMeeting,
  handleJoinMeeting,
  onCreateMeeting,
}) {
  return (
    <div className="chat-header">
      {activeSection || expandedSection ? (
        <button
          className="back-to-chat-btn"
          onClick={onCloseSection || (() => setExpandedSection && setExpandedSection(null))}
        >
          <ArrowLeft size={20} color="white" />
        </button>
      ) : (
        isMobile && (
          <button
            className="back-to-chats-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onBackToChats) onBackToChats();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onBackToChats) onBackToChats();
            }}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <ArrowLeft size={20} color="white" />
          </button>
        )
      )}
      <h3
        onClick={groupId && onGroupNameClick ? onGroupNameClick : undefined}
        style={groupId && onGroupNameClick ? { cursor: "pointer" } : {}}
      >
        {chatTitle}
      </h3>
      <div className="chat-header-actions">
        {showCreateMeetingButton && (
          <button
            className="create-meeting-btn"
            onClick={onCreateMeeting}
            style={{
              background: "#0076EA",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              marginRight: "8px",
            }}
          >
            Create Meeting
          </button>
        )}
        {showJoinMeetingButton && (
          <button
            className={`join-meetings-btn ${isInMeeting ? "in-meeting" : ""}`}
            onClick={handleJoinMeeting}
            disabled={isInMeeting}
          >
            {isInMeeting ? "Joined" : "Join Meeting"}
          </button>
        )}
        {!!groupId && (
          <div className="search-icon-header">
            <MagnifyingGlass size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
