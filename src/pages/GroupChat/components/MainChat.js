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
  const [modalPhoto, setModalPhoto] = useState(null);
  const [contentTab, setContentTab] = useState("media");
  const [mediaTab, setMediaTab] = useState("media");
  const [replyTo, setReplyTo] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResultIds, setSearchResultIds] = useState([]); // ordered by message position in current list when possible
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [activeSearchMessageId, setActiveSearchMessageId] = useState(null);
  const messageElsRef = useRef(new Map());
  const messagesRef = useRef([]);

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

  const [messages, setMessages] = useMainChatMessagesLocal(initialMessages);
  const { messagesContainerRef, messagesEndRef } = useMainChatScroll(messages, groupId, showMainChat, isMobile);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useMainChatSwipeBack({
    mainChatRef,
    isMobile,
    showMainChat,
    onBackToChats,
    onCloseSection,
    activeSection,
  });

  const { mediaTabResources } = useMainChatMediaLinks(messages);

  useEffect(() => {
    setContentTab("media");
    setMediaTab("media");
  }, [activeSection]);

  useEffect(() => {
    setReplyTo(null);
  }, [groupId]);

  useEffect(() => {
    // Reset search when switching group
    setSearchOpen(false);
    setSearchValue("");
    setSearchResultIds([]);
    setActiveSearchIndex(0);
    setActiveSearchMessageId(null);
    messageElsRef.current = new Map();
  }, [groupId]);

  const searchResultIdSet = React.useMemo(() => {
    return new Set((searchResultIds || []).map((x) => String(x)));
  }, [searchResultIds]);

  const registerMessageEl = useCallback((id, el) => {
    if (id == null || !el) return;
    messageElsRef.current.set(String(id), el);
  }, []);

  const getMatchIdsByDomOrder = useCallback(() => {
    // Order by actual position in the rendered message list (top -> bottom)
    const container = messagesContainerRef?.current;
    const set = searchResultIdSet;
    if (!container || !set?.size) return [];
    const rows = [];
    for (const [id, el] of messageElsRef.current.entries()) {
      if (!set.has(String(id))) continue;
      if (!el || !el.isConnected) continue;
      const r = el.getBoundingClientRect();
      rows.push({ id: String(id), top: r.top, el });
    }
    rows.sort((a, b) => a.top - b.top);
    return rows.map((x) => x.id);
  }, [messagesContainerRef, searchResultIdSet]);

  const scrollToMessageId = useCallback((id) => {
    if (id == null) return false;
    const el = messageElsRef.current.get(String(id));
    if (!el) return false;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      return true;
    } catch {
      // fallback
      try {
        el.scrollIntoView();
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const ensureMessageLoaded = useCallback(
    async (targetId) => {
      if (targetId == null) return false;
      const idStr = String(targetId);
      const already = (messagesRef.current || []).some((m) => String(m?.id) === idStr);
      if (already) return true;
      if (!onLoadMoreMessages) return false;

      // Try a few pages (older messages) until we find the id.
      for (let i = 0; i < 8; i += 1) {
        if (!hasMoreMessages) return false;
        await onLoadMoreMessages();
        await new Promise((r) => setTimeout(r, 0));
        const found = (messagesRef.current || []).some((m) => String(m?.id) === idStr);
        if (found) return true;
      }
      return false;
    },
    [onLoadMoreMessages, hasMoreMessages]
  );

  const applyActiveSearchMessageId = useCallback(
    async (msgId) => {
      if (msgId == null) return;
      setActiveSearchMessageId(msgId);
      await ensureMessageLoaded(msgId);
      await new Promise((r) => requestAnimationFrame(() => r()));
      scrollToMessageId(msgId);

      // sync index for the counter when possible
      const ordered = getMatchIdsByDomOrder();
      const idx = ordered.findIndex((id) => id === String(msgId));
      if (idx >= 0) setActiveSearchIndex(idx);
    },
    [ensureMessageLoaded, scrollToMessageId, getMatchIdsByDomOrder]
  );

  const applyActiveSearchIndex = useCallback(
    async (idx) => {
      const ids = Array.isArray(searchResultIds) ? searchResultIds : [];
      if (!ids.length) return;
      const nextIndex = Math.max(0, Math.min(ids.length - 1, idx));
      const msgId = ids[nextIndex];
      setActiveSearchIndex(nextIndex);
      setActiveSearchMessageId(msgId);
      await ensureMessageLoaded(msgId);
      // wait one frame so ref registration happens after list render
      await new Promise((r) => requestAnimationFrame(() => r()));
      scrollToMessageId(msgId);
    },
    [searchResultIds, ensureMessageLoaded, scrollToMessageId]
  );

  const goToNextSearchResult = useCallback(() => {
    const n = searchResultIds.length;
    if (!n) return;
    const next = (activeSearchIndex + 1) % n;
    applyActiveSearchIndex(next);
  }, [
    searchResultIds.length,
    activeSearchIndex,
    applyActiveSearchIndex,
  ]);

  const goToPrevSearchResult = useCallback(() => {
    const n = searchResultIds.length;
    if (!n) return;
    const prev = (activeSearchIndex - 1 + n) % n;
    applyActiveSearchIndex(prev);
  }, [
    searchResultIds.length,
    activeSearchIndex,
    applyActiveSearchIndex,
  ]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchValue("");
    setSearchLoading(false);
    setSearchResultIds([]);
    setActiveSearchIndex(0);
    setActiveSearchMessageId(null);
  }, []);

  const submitSearch = useCallback(async () => {
    if (!groupId) return;
    const word = String(searchValue || "").trim();
    if (!word) {
      closeSearch();
      return;
    }

    setSearchLoading(true);
    try {
      const ids = await searchMessageIds(api, groupId, word);
      const normalizedIds = Array.from(new Set((ids || []).map((x) => String(x))));

      // Prefer ordering by current in-memory message order (so Up = older/above, Down = newer/below).
      const normalizedSet = new Set(normalizedIds);
      const orderedByMessages = (messagesRef.current || [])
        .map((m) => String(m?.id))
        .filter((id) => normalizedSet.has(id));
      const effectiveIds = orderedByMessages.length ? orderedByMessages : normalizedIds;

      setSearchResultIds(effectiveIds);
      if (effectiveIds.length === 0) {
        setActiveSearchIndex(0);
        setActiveSearchMessageId(null);
        smartToast.info("No matches");
        return;
      }

      // Start at the most recent match (near bottom), so Up moves to older/above like WhatsApp.
      await applyActiveSearchIndex(effectiveIds.length - 1);
    } catch (e) {
      smartToast.error(e?.response?.data?.message || "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }, [groupId, searchValue, closeSearch, applyActiveSearchIndex]);

  // If more messages load later, re-order results based on new message list order.
  useEffect(() => {
    if (!searchResultIds.length) return;
    const set = new Set((searchResultIds || []).map((x) => String(x)));
    const ordered = (messagesRef.current || [])
      .map((m) => String(m?.id))
      .filter((id) => set.has(id));
    if (!ordered.length) return;
    const same =
      ordered.length === searchResultIds.length &&
      ordered.every((id, i) => String(searchResultIds[i]) === id);
    if (same) return;
    setSearchResultIds(ordered);
    // keep active message id if still present
    if (activeSearchMessageId != null) {
      const nextIdx = ordered.findIndex((id) => id === String(activeSearchMessageId));
      if (nextIdx >= 0) setActiveSearchIndex(nextIdx);
    }
  }, [messages, searchResultIds, activeSearchMessageId]);

  const handleReplyToMessage = useCallback((message) => {
    if (!message?.id || String(message.id).startsWith("temp-") || message.is_deleted) return;
    setReplyTo({
      id: message.id,
      sender: message.sender || "User",
      snippet: getReplySnippetForMessage(message) || "Message",
    });
  }, []);

  const handleSendWithReply = useCallback(
    async (payload) => {
      const ok = await onSendMessage({
        ...payload,
        ...(replyTo?.id
          ? {
            parentMessageId: replyTo.id,
            parentPreview: { sender: replyTo.sender, text: replyTo.snippet },
          }
          : {}),
      });
      if (ok) setReplyTo(null);
      return ok;
    },
    [onSendMessage, replyTo]
  );

  const handleCancelReply = useCallback(() => setReplyTo(null), []);

  const handlePhotoClick = (item) => {
    if (item.isLink) {
      window.open(item.media_url, "_blank");
      return;
    }
    const url = item.media_url || item.file_url || item.url || item.resource_url;
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

  const handleReactToMessage = useCallback(
    async (messageId, emoji) => {
      if (!groupId || !messageId || !emoji?.trim()) return;
      const trimmedEmoji = emoji.trim();

      const membersArr = Array.isArray(groupMembers) ? groupMembers : [];
      const baseMemberLookup = buildMemberIdLookup(membersArr);
      const baseMemberRecordLookup = buildMemberRecordLookup(membersArr);

      if (socket && isConnected && socketReactToMessage) {
        const socketOk = await new Promise((resolve) => {
          socketReactToMessage(groupId, messageId, trimmedEmoji, (ack) => {
            if (ack?.ok && ack.data?.reactions !== undefined) {
              const lookup = mergeUserIntoMemberLookup(baseMemberLookup, ack.data?.user);
              const recordLookup = mergeUserIntoMemberRecordLookup(
                baseMemberRecordLookup,
                ack.data?.user
              );
              setMessages((prev) =>
                prev.map((msg) =>
                  String(msg.id) !== String(messageId)
                    ? msg
                    : {
                      ...msg,
                      reactions: reactionsFromRawPayload(
                        { reactions: ack.data.reactions },
                        lookup,
                        recordLookup
                      ),
                    }
                )
              );
            }
            resolve(Boolean(ack?.ok));
          });
        });
        if (socketOk) return;
      }

      try {
        const raw = await reactToMessage(api, groupId, messageId, { emoji: trimmedEmoji });
        const data = raw?.data !== undefined ? raw.data : raw;
        const lookupAfterRest = mergeUserIntoMemberLookup(baseMemberLookup, data?.user);
        const recordLookupAfterRest = mergeUserIntoMemberRecordLookup(
          baseMemberRecordLookup,
          data?.user
        );
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId) return msg;

            const nextReactions = reactionsFromRawPayload(
              data && typeof data === "object"
                ? data.reactions != null
                  ? { reactions: data.reactions }
                  : data
                : {},
              lookupAfterRest,
              recordLookupAfterRest
            );

            const reactionBaseForReplace = (mergedMsg) => {
              const fromMerge = mergedMsg?.reactions;
              if (Array.isArray(fromMerge) && fromMerge.length > 0) return fromMerge;
              if (Array.isArray(msg.reactions) && msg.reactions.length > 0) return msg.reactions;
              return Array.isArray(fromMerge) ? fromMerge : [];
            };

            if (
              data &&
              typeof data === "object" &&
              data.id != null &&
              String(data.id) === String(messageId)
            ) {
              const merged = formatMessages([{ ...msg, ...data }])[0];
              const base = reactionBaseForReplace(merged);
              return formatMessages([
                {
                  ...merged,
                  reactions: optimisticReplaceMyReaction(base, trimmedEmoji),
                },
              ])[0];
            }

            if (nextReactions.length > 0) {
              return formatMessages([
                {
                  ...msg,
                  reactions: optimisticReplaceMyReaction(nextReactions, trimmedEmoji),
                },
              ])[0];
            }

            return formatMessages([
              {
                ...msg,
                reactions: optimisticReplaceMyReaction(msg.reactions, trimmedEmoji),
              },
            ])[0];
          })
        );
      } catch (error) {
        smartToast.error(error?.response?.data?.message || "Failed to send reaction");
        console.error("reactToMessage:", error);
      }
    },
    [groupId, setMessages, socket, isConnected, socketReactToMessage, groupMembers]
  );

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

  const [localContentName, setLocalContentName] = useState(null);

  useEffect(() => {
    setLocalContentName(null);
  }, [groupId]);

  const activeContentName = localContentName || groupInfo?.content?.group_content_name || groupInfo?.content?.content_name || groupInfo?.content?.name || "Content Resources";

  const handleUpdateContentName = async (newName) => {
    if (!groupInfo?.content?.id) return;

    // Set locally to trigger instant React re-render without page refresh
    setLocalContentName(newName);

    if (groupInfo.content) {
      groupInfo.content.group_content_name = newName;
      groupInfo.content.content_name = newName;
      groupInfo.content.name = newName;
    }

    try {
      await api.put(`/group-contents/${groupInfo.content.id}`, {
        name: newName,
        content_name: newName,
        group_content_name: newName
      }).catch(async () => {
        const form = new FormData();
        form.append('group_content_name', newName);
        await api.put(`/group/${groupId}`, form);
      });
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
