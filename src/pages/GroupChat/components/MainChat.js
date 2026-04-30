import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatInput from "./ChatInput";
import MainChatHeader from "./MainChatHeader";
import MainChatExpandedSection from "./MainChatExpandedSection";
import MainChatMessageList from "./MainChatMessageList";
import MainChatPhotoModal from "./MainChatPhotoModal";
import { deleteMessage, updateMessage } from "../../../API/auth";
import { formatMessages } from "../utils/mainChatMessageUtils";
import { reactToMessage } from "../services/groupChatService";
import {
  optimisticReplaceMyReaction,
  reactionsFromRawPayload,
  buildMemberIdLookup,
  buildMemberRecordLookup,
  mergeUserIntoMemberLookup,
  mergeUserIntoMemberRecordLookup,
} from "../utils/groupChatFormatters";
import { getReplySnippetForMessage } from "../utils/messageItemUtils";
import "./MainChat.css";
import "../GroupChat.css";
import { smartToast } from "../../../API/toastManager";
import api from "../../../API/axiosInstance";
import { useSocket } from "../../../context/SocketContext";
import { searchMessageIds } from "../services/groupChatService";
import {
  useMainChatMeeting,
  useMainChatMessagesLocal,
  useMainChatScroll,
  useMainChatSwipeBack,
  useMainChatMediaLinks,
  useMessageSearch,
  useMessageActions,
  useReply,
  useMediaViewer,
} from "../hooks";
import * as mainChatService from "../services/mainChatService";

const MainChat = ({
  messages: initialMessages,
  chatTitle,
  isMobile,
  showMainChat,
  onBackToChats,
  onSendMessage,
  activeSection,
  expandedSection,
  onCloseSection,
  setExpandedSection,
  contentResources,
  groupMembers,
  groupInfo,
  currentUserEmail,
  groupId,
  onMessageEdited,
  onMessageDeleted,
  isSendingMessage = false,
  onGroupNameClick,
  userRole,
  loading = false,
  hasMoreMessages = false,
  loadingMoreMessages = false,
  onLoadMoreMessages,
  meetingId,
  onCreateMeeting,
  onRefreshGroupInfo,
  currentUser,
}) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { socket, isConnected, socketReactToMessage } = useSocket();
  const normalizedUserRole = (userRole || "").toString().trim().toLowerCase();
  const isSuperAdmin = normalizedUserRole === "super_admin" || normalizedUserRole === "super-admin";
  const isAdministrator = normalizedUserRole === "administrator";

  const mainChatRef = useRef(null);

  const [messages, setMessages] = useMainChatMessagesLocal(initialMessages);
  const { messagesContainerRef, messagesEndRef } = useMainChatScroll(messages, groupId, showMainChat, isMobile);

  const { hasMeeting, isInMeeting, handleJoinMeeting: handleJoinMeetingFromHook } = useMainChatMeeting(
    api,
    groupId,
    groupInfo,
    meetingId,
    socket
  );
  const handleJoinMeeting = () => handleJoinMeetingFromHook({ searchParams, params });

  const showJoinMeetingButton = !!groupId && normalizedUserRole === "member" && hasMeeting;
  const showCreateMeetingButton = !!groupId && (isAdministrator || isSuperAdmin) && onCreateMeeting;

  useMainChatSwipeBack({
    mainChatRef,
    isMobile,
    showMainChat,
    onBackToChats,
    onCloseSection,
    activeSection,
  });

  const { mediaTabResources } = useMainChatMediaLinks(messages);

  const {
    searchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    searchLoading,
    searchResultIds,
    searchResultIdSet,
    activeSearchIndex,
    activeSearchMessageId,
    submitSearch,
    goToNextSearchResult,
    goToPrevSearchResult,
    closeSearch,
    registerMessageEl
  } = useMessageSearch(api, groupId, messages, hasMoreMessages, onLoadMoreMessages);

  const {
    handleDeleteMessage,
    handleEditMessage,
    handleReactToMessage,
  } = useMessageActions({
    api,
    groupId,
    messages,
    setMessages,
    socket,
    isConnected,
    socketReactToMessage,
    groupMembers,
    onMessageEdited,
    onMessageDeleted,
  });

  const {
    replyTo,
    handleReplyToMessage,
    handleSendWithReply,
    handleCancelReply,
  } = useReply(groupId, onSendMessage);

  const {
    modalPhoto,
    handlePhotoClick,
    closeModal,
  } = useMediaViewer();

  const [contentTab, setContentTab] = useState("media");
  const [mediaTab, setMediaTab] = useState("media");

  useEffect(() => {
    setContentTab("media");
    setMediaTab("media");
  }, [activeSection]);

  const [localContentName, setLocalContentName] = useState(null);

  useEffect(() => {
    setLocalContentName(null);
  }, [groupId]);

  const activeContentName = localContentName || groupInfo?.content?.group_content_name || groupInfo?.content?.content_name || groupInfo?.content?.name || "Content Resources";

  const handleUpdateContentName = async (newName) => {
    if (!groupInfo?.content?.id) return;
    setLocalContentName(newName);

    if (groupInfo.content) {
      groupInfo.content.group_content_name = newName;
      groupInfo.content.content_name = newName;
      groupInfo.content.name = newName;
    }

    try {
      await mainChatService.updateContentName(api, groupId, groupInfo.content.id, newName);
      smartToast.success("Content name updated successfully");
    } catch (error) {
      console.error("Error updating content name:", error);
      smartToast.error("Could not save new content name to server");
    }
  };

  const showExpanded = !!(activeSection || expandedSection);
  const expandedContent = showExpanded ? (
    <MainChatExpandedSection
      activeSection={activeSection}
      expandedSection={expandedSection}
      groupMembers={groupMembers}
      groupInfo={groupInfo}
      mediaTabResources={mediaTabResources}
      mediaTab={mediaTab}
      setMediaTab={setMediaTab}
      contentResources={contentResources}
      contentTab={contentTab}
      setContentTab={setContentTab}
      onMediaClick={handlePhotoClick}
      groupId={groupId}
      userRole={userRole}
      currentUserEmail={currentUserEmail}
      contentName={activeContentName}
      onUpdateContentName={handleUpdateContentName}
      onRefreshGroupInfo={onRefreshGroupInfo}
    />
  ) : null;

  return (
    <div
      ref={mainChatRef}
      className={`main-chat rounded-4 shadow-sm ${isMobile && !showMainChat ? "mobile-hidden" : ""}`}
    >
      <MainChatHeader
        isMobile={isMobile}
        showMainChat={showMainChat}
        activeSection={activeSection}
        expandedSection={expandedSection}
        onCloseSection={onCloseSection}
        setExpandedSection={setExpandedSection}
        onBackToChats={onBackToChats}
        chatTitle={chatTitle}
        contentName={activeContentName}
        groupId={groupId}
        onGroupNameClick={onGroupNameClick}
        showCreateMeetingButton={showCreateMeetingButton}
        showJoinMeetingButton={showJoinMeetingButton}
        isInMeeting={isInMeeting}
        handleJoinMeeting={handleJoinMeeting}
        onCreateMeeting={onCreateMeeting}
        onUpdateContentName={handleUpdateContentName}
        searchOpen={searchOpen}
        searchValue={searchValue}
        searchLoading={searchLoading}
        searchHasResults={searchResultIds.length > 0}
        searchActiveIndex={activeSearchIndex}
        searchTotalResults={searchResultIds.length}
        onSearchPrev={goToPrevSearchResult}
        onSearchNext={goToNextSearchResult}
        onToggleSearch={() => {
          if (searchOpen) closeSearch();
          else setSearchOpen(true);
        }}
        onSearchValueChange={(v) => setSearchValue(v)}
        onSubmitSearch={submitSearch}
        onCloseSearch={closeSearch}
      />
      <div className="chat-messages" ref={messagesContainerRef}>
        <MainChatMessageList
          loading={loading}
          showExpanded={showExpanded}
          expandedContent={expandedContent}
          groupId={groupId}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          currentUser={currentUser}
          currentUserEmail={currentUserEmail}
          onMediaClick={handlePhotoClick}
          userRole={userRole}
          onReply={handleReplyToMessage}
          onReact={handleReactToMessage}
          searchWord={searchOpen ? searchValue : ""}
          searchResultIdSet={searchResultIdSet}
          activeSearchMessageId={activeSearchMessageId}
          onRegisterMessageEl={registerMessageEl}
        />
      </div>
      {!activeSection && !expandedSection && groupId && !isSuperAdmin && (
        <ChatInput
          chatId={groupId}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          onSendMessage={handleSendWithReply}
          isSending={isSendingMessage}
        />
      )}
      <MainChatPhotoModal modalPhoto={modalPhoto} onClose={closeModal} />
    </div>
  );
};

export default MainChat;
