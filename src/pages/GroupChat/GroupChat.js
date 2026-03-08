import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./GroupChat.css";
import { categorizeResources, categorizeMediaItems } from "./components/utils";
import GroupChatLayout from "./components/GroupChatLayout";

import axiosInstance from "../../API/axiosInstance";
import { AuthContext } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { getMediaLabel } from "./utils/groupChatFormatters";
import {
  useGroupChatGroups,
  useGroupChatMessages,
  useGroupChatSocket,
  useGroupChatSend,
} from "./hooks";
import { extractLinksFromMessages } from "./utils/groupChatFormatters";

export default function GroupChat() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const api = axiosInstance;
  const {
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    markAllMessagesRead,
    getUnreadCount,
    sendMessage: socketSendMessage,
  } = useSocket();

  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMainChat, setShowMainChat] = useState(false);
  const [activeInfoSection, setActiveInfoSection] = useState(null);
  const [showRightSidebarMobile, setShowRightSidebarMobile] = useState(false);

  const userRef = useRef(user);
  const markAllMessagesReadRef = useRef(markAllMessagesRead);
  const readGroupsRef = useRef(new Set());
  const markedAsReadRef = useRef(new Set());
  const currentGroupIdRef = useRef(null);
  const joinedGroupsRef = useRef(new Set());
  const openGroupIdFromStateRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    markAllMessagesReadRef.current = markAllMessagesRead;
  }, [markAllMessagesRead]);

  const {
    groupChats,
    setGroupChats,
    loading,
    refreshGroupsList,
  } = useGroupChatGroups(api, readGroupsRef);

  const currentGroupId = useMemo(() => {
    if (selectedChat === null || !groupChats?.length) return null;
    return groupChats[selectedChat]?.id ?? null;
  }, [selectedChat, groupChats]);

  const {
    messages,
    setMessages,
    groupInfo,
    setGroupInfo,
    chatLoading,
    hasMoreMessages,
    loadingMoreMessages,
    loadMoreMessages,
  } = useGroupChatMessages(
    api,
    selectedChat,
    groupChats,
    currentGroupId,
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    getUnreadCount,
    markAllMessagesRead,
    setGroupChats,
    readGroupsRef,
    markedAsReadRef,
    currentGroupIdRef,
    joinedGroupsRef
  );

  useGroupChatSocket(
    socket,
    isConnected,
    groupChats,
    setGroupChats,
    setMessages,
    currentGroupIdRef,
    userRef,
    markAllMessagesReadRef,
    joinedGroupsRef,
    joinGroup,
    leaveGroup,
    (isInitial, sel, chats, setSel) =>
      refreshGroupsList(isInitial, sel, chats, setSel),
    selectedChat,
    setSelectedChat
  );

  const { handleSendMessage, isSendingMessage } = useGroupChatSend(
    api,
    selectedChat,
    groupChats,
    user,
    setMessages,
    setGroupChats,
    setGroupInfo,
    socket,
    isConnected,
    socketSendMessage
  );

  useEffect(() => {
    refreshGroupsList(true, null, [], null);
  }, [refreshGroupsList]);

  useEffect(() => {
    const groupId = location.state?.groupId;
    if (!groupId || !groupChats.length || openGroupIdFromStateRef.current) return;
    const index = groupChats.findIndex((g) => String(g.id) === String(groupId));
    if (index !== -1) {
      openGroupIdFromStateRef.current = true;
      setSelectedChat(index);
      if (window.innerWidth <= 768) setShowMainChat(true);
      navigate("/home", { replace: true, state: {} });
    }
  }, [groupChats, location.state?.groupId, navigate]);

  useEffect(() => {
    if (selectedChat === null) markedAsReadRef.current?.clear();
  }, [selectedChat]);

  useEffect(() => {
    document.documentElement.classList.add("group-chat-active");
    document.body.classList.add("group-chat-active");
    return () => {
      document.documentElement.classList.remove("group-chat-active");
      document.body.classList.remove("group-chat-active");
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setShowMainChat(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChatSelect = (index) => {
    setSelectedChat(index);
    if (isMobile) setShowMainChat(true);
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
    setShowMainChat(false);
    if (showRightSidebarMobile) setShowRightSidebarMobile(false);
    setActiveInfoSection(null);
  };

  const handleGroupNameClick = () => {
    if (!activeInfoSection) setActiveInfoSection("contents");
    if (isMobile) {
      setShowRightSidebarMobile(true);
      setShowMainChat(false);
    } else {
      setShowMainChat(true);
    }
  };

  const handleMessageEdited = (messageId, newText) => {
    setMessages((prevMessages) => {
      const updated = prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, text: newText, message: newText } : msg
      );
      const newLast = updated.filter((m) => !m.is_deleted).pop();
      const newSubject = newLast
        ? newLast.text ||
          (newLast.media?.length > 0
            ? getMediaLabel(newLast.media[0].media_type, newLast.media[0].file_name)
            : "Media attachment")
        : "No messages yet";
      setGroupChats((prev) =>
        prev.map((chat, i) =>
          i === selectedChat ? { ...chat, subject: newSubject } : chat
        )
      );
      return updated;
    });
  };

  const handleMessageDeleted = (messageId) => {
    const messageToDelete = messages.find((m) => m.id === messageId);
    if (messageToDelete?.media?.length > 0) {
      setGroupInfo((prev) => {
        if (!prev) return prev;
        const mediaArray = prev.group?.group_media || prev.group_media || [];
        const updated = mediaArray.filter(
          (item) =>
            !messageToDelete.media.some(
              (dm) =>
                dm.media_url === item.media_url || dm.id === item.id
            )
        );
        if (prev.group?.group_media)
          return { ...prev, group: { ...prev.group, group_media: updated } };
        if (prev.group_media) return { ...prev, group_media: updated };
        return prev;
      });
    }
    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === messageId ? { ...m, is_deleted: true } : m
      );
      const newLast = updated.filter((m) => !m.is_deleted).pop();
      const newSubject = newLast
        ? newLast.text ||
          (newLast.media?.length > 0
            ? getMediaLabel(newLast.media[0].media_type, newLast.media[0].file_name)
            : "Media attachment")
        : "No messages yet";
      setGroupChats((p) =>
        p.map((chat, i) =>
          i === selectedChat ? { ...chat, subject: newSubject } : chat
        )
      );
      return updated;
    });
  };

  const handleToggleInfoSection = (section) => {
    const newSection = activeInfoSection === section ? null : section;
    setActiveInfoSection(newSection);
    if (isMobile && newSection) {
      setShowRightSidebarMobile(false);
      setShowMainChat(true);
    }
  };

  const selectedChatData =
    selectedChat !== null ? groupChats[selectedChat] : null;

  const rawContentResources = useMemo(
    () => groupInfo?.content?.resources || [],
    [groupInfo]
  );
  const contentResources = useMemo(
    () => categorizeResources(rawContentResources),
    [rawContentResources]
  );

  const mediaArray = useMemo(() => {
    if (groupInfo?.group?.group_media) return groupInfo.group.group_media;
    return groupInfo?.group_media || [];
  }, [groupInfo]);

  const groupMediaItems = useMemo(
    () => categorizeMediaItems(mediaArray),
    [mediaArray]
  );

  const allLinks = useMemo(() => {
    const backendLinks = groupMediaItems?.links || [];
    const extracted = extractLinksFromMessages(messages);
    const seen = new Set();
    const combined = [];
    backendLinks.forEach((link) => {
      const url = link.media_url || link.file_url || "";
      if (!url) return;
      try {
        const norm = new URL(url).href.toLowerCase().replace(/\/$/, "");
        if (!seen.has(norm)) {
          seen.add(norm);
          combined.push({ ...link, isLink: true });
        }
      } catch {
        if (!seen.has(url.toLowerCase())) {
          seen.add(url.toLowerCase());
          combined.push({ ...link, isLink: true });
        }
      }
    });
    extracted.forEach((link) => {
      const url = link.media_url || link.original_url || "";
      if (!url) return;
      try {
        const norm = new URL(url).href.toLowerCase().replace(/\/$/, "");
        if (!seen.has(norm)) {
          seen.add(norm);
          combined.push(link);
        }
      } catch {
        if (!seen.has(url.toLowerCase())) {
          seen.add(url.toLowerCase());
          combined.push(link);
        }
      }
    });
    return combined;
  }, [groupMediaItems?.links, messages]);

  const mediaSummary = useMemo(
    () => ({
      images: groupMediaItems?.images || [],
      videos: groupMediaItems?.videos || [],
      audio: groupMediaItems?.audio || [],
      files: groupMediaItems?.files || [],
      links: allLinks,
    }),
    [groupMediaItems, allLinks]
  );

  const groupMembers = useMemo(() => groupInfo?.members || [], [groupInfo]);

  const userRole = useMemo(() => {
    if (!user?.id || !groupInfo) return "Member";
    if (user?.role === "Super_Admin") return "Super_Admin";
    const adminId =
      groupInfo.group?.administrator_id || groupInfo.administrator_id;
    if (adminId && String(adminId) === String(user.id)) return "Administrator";
    return "Member";
  }, [user?.id, user?.role, groupInfo]);

  const calendarEvents = [
    {
      month: "Sep",
      day: "25",
      online: "Online",
      type: "Group Meeting",
      startTime: "8:25",
      startPeriod: "AM",
      endTime: "10:20",
      endPeriod: "AM",
      avatars: ["M", "A"],
    },
    {
      month: "Sep",
      day: "26",
      online: "Online",
      type: "Group Meeting",
      startTime: "8:25",
      startPeriod: "AM",
      endTime: "10:20",
      endPeriod: "AM",
      avatars: ["M", "A"],
    },
  ];

  const currentUser = {
    name: user?.name || "User",
    initials: user?.name?.charAt(0)?.toUpperCase() || "U",
    status: "Online",
  };

  return (
    <GroupChatLayout
      loading={loading}
      groupChats={groupChats}
      selectedChat={selectedChat}
      onChatSelect={handleChatSelect}
      isMobile={isMobile}
      showMainChat={showMainChat}
      selectedChatData={selectedChatData}
      messages={messages}
      chatTitle={
        selectedChat !== null && groupChats[selectedChat]
          ? groupChats[selectedChat]?.name
          : "Select a chat"
      }
      onBackToChats={handleBackToChats}
      onSendMessage={handleSendMessage}
      activeInfoSection={activeInfoSection}
      onCloseSection={() => setActiveInfoSection(null)}
      contentResources={contentResources}
      groupMediaItems={groupMediaItems}
      groupMembers={groupMembers}
      groupInfo={groupInfo}
      currentUserEmail={user?.email}
      onMessageEdited={handleMessageEdited}
      onMessageDeleted={handleMessageDeleted}
      isSendingMessage={isSendingMessage}
      onGroupNameClick={handleGroupNameClick}
      userRole={userRole}
      chatLoading={chatLoading}
      onSelectSection={handleToggleInfoSection}
      mediaSummary={mediaSummary}
      showRightSidebarMobile={showRightSidebarMobile}
      onCloseMobile={() => {
        setShowRightSidebarMobile(false);
        setActiveInfoSection(null);
        if (isMobile) setShowMainChat(true);
      }}
      onOpenSidebar={() =>
        window.dispatchEvent(new CustomEvent("openMobileSidebar"))
      }
      onOpenNotifications={() =>
        window.dispatchEvent(new CustomEvent("openNotificationPanel"))
      }
      unreadNotificationCount={0}
      calendarEvents={calendarEvents}
      currentUser={currentUser}
      hasMoreMessages={hasMoreMessages}
      loadingMoreMessages={loadingMoreMessages}
      onLoadMoreMessages={loadMoreMessages}
    />
  );
}
