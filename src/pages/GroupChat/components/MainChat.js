import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatInput from "./ChatInput";
import MainChatHeader from "./MainChatHeader";
import MainChatExpandedSection from "./MainChatExpandedSection";
import MainChatMessageList from "./MainChatMessageList";
import MainChatPhotoModal from "./MainChatPhotoModal";
import { deleteMessage, updateMessage } from "../../../API/auth";
import { formatMessages } from "../utils/mainChatMessageUtils";
import "./MainChat.css";
import "../GroupChat.css";
import { smartToast } from "../../../API/toastManager";
import api from "../../../API/axiosInstance";
import { useSocket } from "../../../context/SocketContext";
import {
  useMainChatMeeting,
  useMainChatMessagesLocal,
  useMainChatScroll,
  useMainChatSwipeBack,
  useMainChatMediaLinks,
} from "../hooks";

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
  groupMediaItems,
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
}) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { socket } = useSocket();
  const normalizedUserRole = (userRole || "").toString().trim().toLowerCase();
  const isSuperAdmin = normalizedUserRole === "super_admin" || normalizedUserRole === "super-admin";
  const isAdministrator = normalizedUserRole === "administrator";

  const mainChatRef = useRef(null);
  const [modalPhoto, setModalPhoto] = useState(null);
  const [contentTab, setContentTab] = useState("media");
  const [mediaTab, setMediaTab] = useState("media");

  const { hasMeeting, isInMeeting, handleJoinMeeting: handleJoinMeetingFromHook } = useMainChatMeeting(
    api,
    groupId,
    groupInfo,
    meetingId,
    socket
  );
  const handleJoinMeeting = () => handleJoinMeetingFromHook({ searchParams, params });

  const showJoinMeetingButton = !!groupId && normalizedUserRole === "member" && hasMeeting;
  const showCreateMeetingButton = !!groupId && isAdministrator && onCreateMeeting;

  const [messages, setMessages] = useMainChatMessagesLocal(initialMessages);
  const { messagesContainerRef, messagesEndRef } = useMainChatScroll(messages, groupId, showMainChat, isMobile);

  useMainChatSwipeBack({
    mainChatRef,
    isMobile,
    showMainChat,
    onBackToChats,
    onCloseSection,
    activeSection,
  });

  const { mediaTabResources } = useMainChatMediaLinks(messages, groupMediaItems);

  useEffect(() => {
    setContentTab("media");
    setMediaTab("media");
  }, [activeSection]);

  const handlePhotoClick = (item) => {
    if (item.isLink) {
      window.open(item.media_url, "_blank");
      return;
    }
    const url = item.media_url || item.file_url;
    const isImage =
      /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
      item.media_type?.startsWith("image") ||
      item.file_type?.startsWith("image/");
    const isVideo =
      /\.(mp4|webm|ogg|mov)$/i.test(url) ||
      item.media_type?.startsWith("video") ||
      item.file_type?.startsWith("video/");
    const isAudio =
      /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(url) ||
      item.media_type?.startsWith("audio") ||
      item.media_type === "voice" ||
      item.media_type === "voice_note" ||
      item.file_type?.startsWith("audio/");
    if (isAudio) {
      window.open(url, "_blank");
      return;
    }
    setModalPhoto({
      media_url: url,
      file_url: url,
      file_name: item.file_name || "Media",
      media_type: isImage ? "image" : isVideo ? "video" : "file",
    });
  };

  const closeModal = () => setModalPhoto(null);

  const handleDeleteMessage = async (messageId) => {
    if (!groupId) {
      smartToast.error("Group ID is missing");
      return;
    }
    try {
      await deleteMessage(groupId, messageId);
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, is_deleted: true } : msg)));
      if (onMessageDeleted) onMessageDeleted(messageId);
      smartToast.success("Message deleted successfully");
    } catch (error) {
      smartToast.error("Failed to delete message");
      console.error("Error deleting message:", error);
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!groupId || !newText?.trim()) return;
    const trimmedText = newText.trim();
    try {
      const response = await updateMessage(groupId, messageId, trimmedText);
      let updatedMessage = (response?.data != null ? response.data : response) ?? null;
      if (!updatedMessage?.id) throw new Error("Invalid response from update API");
      const originalMessage = messages.find((msg) => msg.id === messageId);
      const messageWithNewText = {
        ...originalMessage,
        ...updatedMessage,
        message: updatedMessage.message ?? updatedMessage.text ?? trimmedText,
        text: updatedMessage.text ?? updatedMessage.message ?? trimmedText,
      };
      const formattedUpdated = formatMessages([messageWithNewText])[0];
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? formattedUpdated : msg)));
      smartToast.success("Message updated successfully");
      if (onMessageEdited) onMessageEdited(messageId, trimmedText);
    } catch (error) {
      smartToast.error("Failed to edit message");
      console.error("Error editing message:", error);
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
        groupId={groupId}
        onGroupNameClick={onGroupNameClick}
        showCreateMeetingButton={showCreateMeetingButton}
        showJoinMeetingButton={showJoinMeetingButton}
        isInMeeting={isInMeeting}
        handleJoinMeeting={handleJoinMeeting}
        onCreateMeeting={onCreateMeeting}
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
          currentUserEmail={currentUserEmail}
          onMediaClick={handlePhotoClick}
          userRole={userRole}
        />
      </div>
      {!activeSection && !expandedSection && groupId && !isSuperAdmin && (
        <ChatInput onSendMessage={onSendMessage} isSending={isSendingMessage} />
      )}
      <MainChatPhotoModal modalPhoto={modalPhoto} onClose={closeModal} />
    </div>
  );
};

export default MainChat;
