import React, { useMemo } from "react";
import ChatsPanel from "./ChatsPanel";
import MainChat from "./MainChat";
import RightSidebar from "./RightSidebar";

/**
 * Presentational layout for GroupChat: loading state + ChatsPanel + MainChat + RightSidebar.
 * All behavior and props are passed from GroupChat.
 */
function GroupChatLayout({
  loading,
  groupChats,
  selectedChat,
  onChatSelect,
  isMobile,
  showMainChat,
  selectedChatData,
  messages,
  chatTitle,
  onBackToChats,
  onSendMessage,
  activeInfoSection,
  onCloseSection,
  contentResources,
  groupMediaItems,
  groupMembers,
  groupInfo,
  currentUserEmail,
  onMessageEdited,
  onMessageDeleted,
  isSendingMessage,
  onGroupNameClick,
  userRole,
  chatLoading,
  onSelectSection,
  mediaSummary,
  showRightSidebarMobile,
  onCloseMobile,
  onOpenSidebar,
  onOpenNotifications,
  unreadNotificationCount,
  calendarEvents,
  onGoToMeeting,
  currentUser,
  hasMoreMessages = false,
  loadingMoreMessages = false,
  onLoadMoreMessages,
  onVideoSessionsClick,
  onRefreshGroupInfo,
}) {
  const emptyMessages = useMemo(() => [], []);

  if (loading) {
    return (
      <div
        className="home-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading groups...
      </div>
    );
  }

  return (
    <div className="home-container">
      <ChatsPanel
        groupChats={groupChats}
        selectedChat={selectedChat}
        onChatSelect={onChatSelect}
        isMobile={isMobile}
        showMainChat={showMainChat}
      />

      <MainChat
        key={selectedChatData?.id || "no-chat"}
        messages={selectedChatData ? messages : emptyMessages}
        chatTitle={chatTitle}
        isMobile={isMobile}
        showMainChat={showMainChat}
        onBackToChats={onBackToChats}
        onSendMessage={onSendMessage}
        activeSection={activeInfoSection}
        onCloseSection={onCloseSection}
        contentResources={contentResources}
        groupMediaItems={groupMediaItems}
        groupMembers={groupMembers}
        groupInfo={groupInfo}
        currentUserEmail={currentUserEmail}
        groupId={selectedChatData?.id || null}
        onMessageEdited={onMessageEdited}
        onMessageDeleted={onMessageDeleted}
        isSendingMessage={isSendingMessage}
        onGroupNameClick={onGroupNameClick}
        userRole={userRole}
        loading={chatLoading}
        hasMoreMessages={hasMoreMessages}
        loadingMoreMessages={loadingMoreMessages}
        onLoadMoreMessages={onLoadMoreMessages}
        onRefreshGroupInfo={onRefreshGroupInfo}
      />

      {selectedChatData && (
        <RightSidebar
          groupInfo={groupInfo}
          calendarEvents={calendarEvents}
          onGoToMeeting={onGoToMeeting}
          user={currentUser}
          isMobile={isMobile}
          showMainChat={showMainChat}
          activeSection={activeInfoSection}
          onSelectSection={onSelectSection}
          contentSummary={contentResources}
          mediaSummary={mediaSummary}
          memberCount={groupMembers?.length ?? 0}
          showMobile={showRightSidebarMobile}
          selectedChat={selectedChat}
          onCloseMobile={onCloseMobile}
          onOpenSidebar={onOpenSidebar}
          onOpenNotifications={onOpenNotifications}
          unreadNotificationCount={unreadNotificationCount}
          onVideoSessionsClick={onVideoSessionsClick}
        />
      )}
    </div>
  );
}

export default GroupChatLayout;
