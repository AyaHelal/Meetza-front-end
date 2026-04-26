import React, { useEffect, useRef } from "react";
import { ArrowLeft, MagnifyingGlass, X, CaretUp, CaretDown } from "@phosphor-icons/react";

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
  searchOpen,
  searchValue,
  searchLoading,
  searchHasResults,
  searchActiveIndex,
  searchTotalResults,
  onSearchPrev,
  onSearchNext,
  onToggleSearch,
  onSearchValueChange,
  onSubmitSearch,
  onCloseSearch,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus?.(), 0);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

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
      <div 
        style={{ display: 'flex', flexDirection: 'column', flex: 1, justifySelf: 'flex-start' }}
      >
        <h3 
          onClick={groupId && onGroupNameClick ? onGroupNameClick : undefined}
          style={{ margin: 0, fontSize: '1.2rem', cursor: groupId && onGroupNameClick ? "pointer" : "default" }}
        >
          {chatTitle}
        </h3>
      </div>

      <div className="chat-header-actions">
        {!!groupId && searchOpen && (
          <form
            className="chat-header-search"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitSearch?.();
            }}
          >
            <MagnifyingGlass size={18} />
            <input
              ref={inputRef}
              value={searchValue || ""}
              onChange={(e) => onSearchValueChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  onSearchPrev?.();
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  onSearchNext?.();
                }
              }}
              placeholder="Search in chat"
              aria-label="Search in chat"
              disabled={searchLoading}
            />
            {searchTotalResults > 0 ? (
              <span className="chat-header-search-count" aria-label="Search result position">
                {(Number(searchActiveIndex) || 0) + 1}/{searchTotalResults}
              </span>
            ) : null}
            <button
              type="button"
              className="chat-header-search-nav"
              onClick={() => onSearchPrev?.()}
              aria-label="Previous match"
              disabled={searchLoading || !searchTotalResults}
            >
              <CaretUp size={18} />
            </button>
            <button
              type="button"
              className="chat-header-search-nav"
              onClick={() => onSearchNext?.()}
              aria-label="Next match"
              disabled={searchLoading || !searchTotalResults}
            >
              <CaretDown size={18} />
            </button>
            <button
              type="button"
              className="chat-header-search-close"
              onClick={() => onCloseSearch?.()}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </form>
        )}
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
          <button
            type="button"
            className={`search-icon-header${searchOpen || searchHasResults ? " search-icon-header--active" : ""}`}
            onClick={() => onToggleSearch?.()}
            aria-label="Search messages"
            aria-pressed={Boolean(searchOpen)}
          >
            <MagnifyingGlass size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
