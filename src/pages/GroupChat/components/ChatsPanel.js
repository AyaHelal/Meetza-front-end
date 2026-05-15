import React, { useState, useMemo } from "react";
import axiosInstance from "../../../API/axiosInstance";
import { useSocket } from "../../../context/SocketContext";
import { useChatsPanelUnread, useChatsPanelMessagePreviews } from "../hooks";
import ChatsPanelToolbar from "./ChatsPanelToolbar";
import ChatsPanelList from "./ChatsPanelList";
import "./ChatsPanel.css";

const ChatsPanel = ({
  groupChats,
  selectedChat,
  onChatSelect,
  isMobile,
  showMainChat,
}) => {
  const { socket, isConnected, getUnreadCount } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [unreadMap, setUnreadMap, unreadLoading] = useChatsPanelUnread(
    axiosInstance,
    groupChats,
    selectedChat,
    socket,
    isConnected,
    getUnreadCount
  );

  const [messagePreviews, previewsLoading] = useChatsPanelMessagePreviews(
    axiosInstance,
    groupChats
  );

  const isPanelDataLoading =
    Boolean(groupChats?.length) && (unreadLoading || previewsLoading);

  const mergedChats = useMemo(() => {
    return (groupChats || []).map((c, index) => {
      const parentVal = Number(c.unread ?? c.unread_count ?? c.unreadCount ?? 0);
      const fetched = Number(unreadMap[String(c.id)] ?? 0);
      const isCurrentlySelected = selectedChat === index;
      const unread = isCurrentlySelected ? 0 : Math.max(parentVal, fetched);
      return { ...c, unread };
    });
  }, [groupChats, unreadMap, selectedChat]);

  const chatsToDisplay = useMemo(() => {
    if (activeTab === "unread") {
      return mergedChats.filter(
        (chat) => Number(chat.unread ?? chat.unread_count ?? chat.unreadCount ?? 0) > 0
      );
    }
    return mergedChats;
  }, [activeTab, mergedChats]);

  const filteredChats = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return chatsToDisplay.filter((chat) => {
      if (!chat) return false;
      const chatName = (chat.name || chat.group_name || "").toLowerCase();
      const chatSubject = (chat.subject || "").toLowerCase();
      return chatName.includes(searchLower) || chatSubject.includes(searchLower);
    });
  }, [chatsToDisplay, searchQuery]);

  return (
    <div
      className={`chats-panel rounded-4 shadow-sm ${isMobile && showMainChat ? "mobile-hidden" : ""
        }`}
    >
      <ChatsPanelToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="chats-list">
        <ChatsPanelList
          filteredChats={filteredChats}
          groupChats={groupChats || []}
          selectedChat={selectedChat}
          messagePreviews={messagePreviews}
          unreadMap={unreadMap}
          setUnreadMap={setUnreadMap}
          onChatSelect={onChatSelect}
          isPanelDataLoading={isPanelDataLoading}
        />
      </div>
    </div>
  );
};

export default ChatsPanel;
