import React from "react";
import { Users } from "@phosphor-icons/react";
import { normalizeLastMessagePreview } from "../utils/groupChatFormatters";
import ChatItem from "./ChatItem";
import "./MainChat.css";

function formatChatDate(chat) {
  const dateField =
    chat.date ||
    chat.last_message_at ||
    chat.last_message_time ||
    chat.updated_at;
  if (!dateField) return "";
  try {
    const dateObj = new Date(dateField);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    }
  } catch (e) {}
  return "";
}

export default function ChatsPanelList({
  filteredChats,
  groupChats,
  selectedChat,
  messagePreviews,
  unreadMap,
  setUnreadMap,
  onChatSelect,
  isPanelDataLoading = false,
}) {
  if (isPanelDataLoading) {
    return (
      <div className="loading-container chats-panel-loading">
        <div className="loading-spinner" />
        <p>Loading chats...</p>
      </div>
    );
  }

  if (filteredChats.length === 0) {
    return (
      <div className="no-chats-container">
        {groupChats.length === 0 ? (
          <div className="no-groups-message">
            <div className="no-groups-icon">
              <Users size={64} weight="duotone" />
            </div>
            <p className="no-groups-text">No groups yet</p>
            <p className="no-groups-subtext">Please go to groups page and join groups</p>
          </div>
        ) : (
          <img
            src="/assets/GroupChat.png"
            alt="No chats"
            className="no-chats-image"
          />
        )}
      </div>
    );
  }

  return filteredChats.map((chat, index) => {
    const chatId = chat.id || chat.group_id;
    const originalIndex = groupChats.findIndex(
      (g) => String(g.id) === String(chatId)
    );
    const formattedDate = formatChatDate(chat);
    const cachedPreview = messagePreviews[String(chatId)];
    const fallbackSubject = chat.subject || chat.last_message;
    const subjectResolved =
      cachedPreview ||
      normalizeLastMessagePreview(fallbackSubject) ||
      fallbackSubject ||
      "No messages yet";

    const formattedChat = {
      ...chat,
      name: chat.name || chat.group_name,
      subject: subjectResolved,
      avatar:
        chat.avatar ||
        (chat.name || chat.group_name)?.charAt(0)?.toUpperCase() ||
        "G",
      avatarImage: chat.avatarImage || chat.group_photo || chat.photo,
      date: formattedDate || chat.date || "",
      unread: chat.unread ?? chat.unread_count ?? chat.unreadCount ?? 0,
    };

    return (
      <ChatItem
        key={chatId || index}
        chat={formattedChat}
        isActive={
          selectedChat === originalIndex && originalIndex !== -1
        }
        onClick={() => {
          if (originalIndex !== -1) {
            onChatSelect(originalIndex, {
              fromPanel: true,
              unreadCount: Number(formattedChat.unread || 0),
            });
            setUnreadMap((prev) => ({
              ...prev,
              [String(chatId)]: 0,
            }));
          }
        }}
      />
    );
  });
}
