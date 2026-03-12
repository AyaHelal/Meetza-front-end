import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VideoSessionsProvider } from "../VideoSessions/store/videoSessionsStore";
import VideoSessionsSection from "../VideoSessions/VideoSessionsSection";
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
import { useMainChatMeeting } from "./hooks/useMainChatMeeting";
import { getMeetingsByGroupId } from "./services/mainChatService";
import { meetingToCalendarEvent, getMeetingId } from "./utils/mainChatMeetingUtils";
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
  const [groupMeetings, setGroupMeetings] = useState([]);

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

  const mainChatMeeting = useMainChatMeeting(
    api,
    currentGroupId,
    groupInfo,
    null,
    socket
  );
  const handleJoinMeeting = mainChatMeeting?.handleJoinMeeting ?? (() => { });

  const refetchGroupMeetings = useCallback(() => {
    if (!currentGroupId) return;
    getMeetingsByGroupId(api, currentGroupId).then((list) => {
      setGroupMeetings(Array.isArray(list) ? list : []);
    });
  }, [api, currentGroupId]);

  useEffect(() => {
    if (!currentGroupId) {
      setGroupMeetings([]);
      return;
    }
    let cancelled = false;
    getMeetingsByGroupId(api, currentGroupId).then((list) => {
      if (!cancelled) setGroupMeetings(Array.isArray(list) ? list : []);
    });
    return () => { cancelled = true; };
  }, [api, currentGroupId]);

  useEffect(() => {
    if (!socket || !currentGroupId) return;
    const onMeetingListChange = (data) => {
      const gid = data?.group_id ?? data?.groupId;
      if (gid == null || String(gid) === String(currentGroupId)) {
        refetchGroupMeetings();
      }
    };
    socket.on("meetingCreated", onMeetingListChange);
    socket.on("meetingUpdated", onMeetingListChange);
    socket.on("meetingEnded", onMeetingListChange);
    socket.on("meetingDeleted", onMeetingListChange);
    return () => {
      socket.off("meetingCreated", onMeetingListChange);
      socket.off("meetingUpdated", onMeetingListChange);
      socket.off("meetingEnded", onMeetingListChange);
      socket.off("meetingDeleted", onMeetingListChange);
    };
  }, [socket, currentGroupId, refetchGroupMeetings]);

  useEffect(() => {
    if (!currentGroupId) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refetchGroupMeetings();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [currentGroupId, refetchGroupMeetings]);

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

  const calendarEvents = useMemo(() => {
    return (groupMeetings || [])
      .map((m) => meetingToCalendarEvent(m))
      .filter(Boolean);
  }, [groupMeetings]);

  const onGoToMeeting = useCallback(
    (meeting) => {
      const meetingId = meeting ? getMeetingId(meeting) : null;
      if (!meetingId) return;
      handleJoinMeeting({ meetingId });
    },
    [handleJoinMeeting]
  );

  const currentUser = {
    name: user?.name || "User",
    initials: user?.name?.charAt(0)?.toUpperCase() || "U",
    status: "Online",
  };

  const scrollWrapRef = useRef(null);
  const videoSectionRef = useRef(null);
  const videoLockThresholdRef = useRef(0);
  const lockTimeoutRef = useRef(null);
  const scrollingToTopRef = useRef(false);
  const scrollingToVideoRef = useRef(false);
  const [videoSectionLocked, setVideoSectionLocked] = useState(false);
  const videoSectionLockedRef = useRef(false);
  useEffect(() => {
    videoSectionLockedRef.current = videoSectionLocked;
  }, [videoSectionLocked]);

  /* Restore video section view on load when URL has #video-sessions (e.g. after refresh) */
  useEffect(() => {
    if ((window.location?.hash || "") === "#video-sessions") {
      setVideoSectionLocked(true);
    }
  }, []);

  // When NOT in video section: prevent scrolling down to video (keep at top unless we're programmatically scrolling to video).
  useEffect(() => {
    if (videoSectionLocked) return;
    const wrap = scrollWrapRef.current;
    if (!wrap) return;
    const onScroll = () => {
      if (scrollingToVideoRef.current || scrollingToTopRef.current) return;
      if (wrap.scrollTop > 0) {
        wrap.scrollTop = 0;
      }
    };
    wrap.addEventListener("scroll", onScroll, { passive: false });
    return () => wrap.removeEventListener("scroll", onScroll);
  }, [videoSectionLocked]);

  // When IN video section: prevent scrolling up past threshold only if chat is still visible (desktop).
  // When video-section-active (chat hidden), allow free scroll so user can scroll the video list.
  useEffect(() => {
    if (!videoSectionLocked) return;
    const wrap = scrollWrapRef.current;
    if (!wrap) return;
    const onScroll = () => {
      if (scrollingToTopRef.current) return;
      if (wrap.classList.contains("video-section-active")) return; /* allow free scroll */
      const threshold = videoLockThresholdRef.current;
      if (wrap.scrollTop < threshold) {
        wrap.scrollTop = threshold;
      }
    };
    wrap.addEventListener("scroll", onScroll, { passive: false });
    return () => wrap.removeEventListener("scroll", onScroll);
  }, [videoSectionLocked]);

  const handleVideoSessionsClick = useCallback(() => {
    const wrap = scrollWrapRef.current;
    const section = videoSectionRef.current;
    if (!wrap || !section) return;
    if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
    const threshold = section.offsetTop;
    videoLockThresholdRef.current = threshold;
    scrollingToVideoRef.current = true;
    window.location.hash = "video-sessions";
    wrap.scrollTo({ top: threshold, behavior: "smooth" });
    lockTimeoutRef.current = setTimeout(() => {
      setVideoSectionLocked(true);
      scrollingToVideoRef.current = false;
      lockTimeoutRef.current = null;
    }, 800);
  }, []);

  const goBackFromVideoSection = useCallback((updateHash = true) => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    scrollingToTopRef.current = true;
    setVideoSectionLocked(false);
    if (updateHash) window.location.hash = "";
    scrollWrapRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      scrollingToTopRef.current = false;
    }, 600);
  }, []);

  const handleVideoSessionsBack = useCallback(() => {
    goBackFromVideoSection(true);
  }, [goBackFromVideoSection]);

  useEffect(() => {
    const onPopState = () => {
      if (videoSectionLockedRef.current && window.location.hash !== "video-sessions") {
        goBackFromVideoSection(false);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [goBackFromVideoSection]);

  useEffect(() => {
    if (!videoSectionLocked) return;
    const wrap = scrollWrapRef.current;
    if (wrap) wrap.scrollTo(0, 0);
  }, [videoSectionLocked]);

  return (
    <div
      ref={scrollWrapRef}
      className={`group-chat-page-scroll-wrap${videoSectionLocked ? " video-section-active" : ""}`}
    >
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
        onGoToMeeting={onGoToMeeting}
        currentUser={currentUser}
        hasMoreMessages={hasMoreMessages}
        loadingMoreMessages={loadingMoreMessages}
        onLoadMoreMessages={loadMoreMessages}
        onVideoSessionsClick={handleVideoSessionsClick}
      />
      <div ref={videoSectionRef} id="video-sessions-section" className="video-sessions-section-wrap">
        <VideoSessionsProvider>
          <VideoSessionsSection
            onBack={handleVideoSessionsBack}
            groupId={currentGroupId}
          />
        </VideoSessionsProvider>
      </div>
    </div>
  );
}
