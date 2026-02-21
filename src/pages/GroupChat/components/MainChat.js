import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useContext } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";
import {
  MagnifyingGlass,
  ArrowLeft,
  Microphone,
  Play,
} from "@phosphor-icons/react";
import { deleteMessage, updateMessage, getMessages } from "../../../API/auth";
import { categorizeResources } from "./utils";
import "./MainChat.css";
import { smartToast } from "../../../API/toastManager";
import "../GroupChat.css";
import { File } from "lucide-react";
import api from "../../../API/axiosInstance";
import { useSocket } from "../../../context/SocketContext";

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
  meetingId, // Optional prop for meeting ID
  onCreateMeeting, // Function to open create meeting modal
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { socket } = useSocket();
  const normalizedUserRole = (userRole || "").toString().trim().toLowerCase();
  const isSuperAdmin = normalizedUserRole === "super_admin" || normalizedUserRole === "super-admin";
  const isAdministrator = normalizedUserRole === "administrator";
  // Join Meeting: only for Member, and only when a group chat is open (not on chat list)
  const [hasMeeting, setHasMeeting] = useState(false);
  const [activeMeetingIdForGroup, setActiveMeetingIdForGroup] = useState(null);
  const [isInMeeting, setIsInMeeting] = useState(false);

  // A meeting is considered "currently active" only if:
  // - status is *not* Completed/Cancelled, and
  // - the current time is between start_time and end_time.
  const isMeetingCurrentlyActive = (meeting) => {
    if (!meeting) return false;

    const normalizeStatus = (s) => (s || "").toString().trim().toLowerCase();
    const status = normalizeStatus(meeting.status);

    // Explicitly treat Completed / Cancelled as inactive
    if (["completed", "cancelled"].includes(status)) {
      return false;
    }

    const startRaw = meeting.start_time;
    const endRaw = meeting.end_time;
    if (!startRaw || !endRaw) return false;

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }

    const now = new Date();
    return now >= start && now < end;
  };

  const showJoinMeetingButton =
    !!groupId && normalizedUserRole === "member" && hasMeeting;
  // Create Meeting: only for Administrator, and only when a group chat is open
  const showCreateMeetingButton =
    !!groupId && isAdministrator && onCreateMeeting;

  // Handle join meeting API call
  // Handle join meeting API call
  // Handle join meeting API call
  const handleJoinMeeting = async () => {
    try {
      // Debug: Log all possible sources of meeting ID
      console.log("🔍 Debugging meeting ID sources:", {
        meetingIdProp: meetingId,
        paramsMeetingId: params.meetingId,
        searchParamsMeetingId: searchParams.get('meetingId'),
        groupInfoMeetingId: groupInfo?.meeting?.id,
        groupInfoMeeting_id: groupInfo?.meeting_id,
        groupInfoMeetingId2: groupInfo?.meetingId,
        groupInfoGroupMeetingId: groupInfo?.group?.meeting?.id,
        groupInfoGroupMeeting_id: groupInfo?.group?.meeting_id,
        groupInfoGroupMeetingId2: groupInfo?.group?.meetingId,
        fullGroupInfo: groupInfo,
        groupId: groupId
      });

      // Get meeting ID from various sources (prop, URL param, search param, groupInfo)
      let dynamicMeetingId = meetingId ||
        params.meetingId ||
        searchParams.get('meetingId') ||
        groupInfo?.meeting?.id ||
        groupInfo?.meeting_id ||
        groupInfo?.meetingId ||
        groupInfo?.group?.meeting?.id ||
        groupInfo?.group?.meeting_id ||
        groupInfo?.group?.meetingId;

      console.log("📍 Dynamic meeting ID found:", dynamicMeetingId);

      // If meeting ID not found, try to fetch from meetings API using groupId (works for members too)
      if (!dynamicMeetingId && groupId) {
        console.log("🔄 Attempting to fetch meetings from API...");
        try {
          // Backend: GET /meeting?group_id=... (getAllMeetings with group filter)
          const meetingsResponse = await api.get("/meeting", { params: { group_id: groupId } });
          console.log("✅ Meetings response:", meetingsResponse);
          // Support multiple possible response shapes:
          // - { success, data: [...] } or { success, data: {...} }
          // - { data: { success, data: ... } } (nested)
          // - plain meeting object / array
          const root = meetingsResponse?.data;
          const nested = root?.data && (root?.success === undefined) ? root?.data : null;
          const effective = nested || root;
          const payload = effective?.data ?? effective;
          const meetings = Array.isArray(payload) ? payload : payload ? [payload] : [];

          // If API doesn't send an explicit "success" boolean, fall back to "has data"
          const isSuccess =
            effective?.success === undefined ? meetings.length > 0 : !!effective?.success;

          if (isSuccess && meetings.length > 0) {
            // Prefer a meeting that is *currently active* (based on time + status)
            const activeMeeting =
              meetings.find((m) => isMeetingCurrentlyActive(m)) || meetings[0];

            dynamicMeetingId =
              activeMeeting?.id ||
              activeMeeting?.meeting_id ||
              activeMeeting?.meetingId ||
              activeMeeting?.meeting?.id;

            console.log("✅ Found meeting from API:", activeMeeting, {
              extractedMeetingId: dynamicMeetingId,
            });
          } else {
            console.warn("⚠️ Meetings API returned no meetings for this group.");
          }
        } catch (fetchError) {
          console.warn("⚠️ Could not fetch meetings for group:", fetchError);
        }
      }

      if (!dynamicMeetingId) {
        console.error("❌ No meeting ID found after all attempts");
        smartToast.error("No meeting available to join. Please wait for an administrator to create a meeting.");
        return;
      }

      // Validate that we're not accidentally using groupId as meetingId
      if (dynamicMeetingId === groupId) {
        console.warn("⚠️ Warning: Meeting ID matches group ID, this might be incorrect");
        smartToast.error("Invalid meeting ID. Please contact your administrator.");
        return;
      }

      console.log("🚀 Attempting to join meeting:", dynamicMeetingId);

      // Check if meeting is still active before joining
      try {
        const meetingCheckRes = await api.get(`/meeting/${dynamicMeetingId}`);
        const meetingData = meetingCheckRes?.data;

        // Extract meeting from response (handle array or object)
        let meeting;
        if (Array.isArray(meetingData?.data)) {
          meeting = meetingData.data.find(m => m.id === dynamicMeetingId);
        } else if (meetingData?.data?.id) {
          meeting = meetingData.data;
        } else if (meetingData?.id) {
          meeting = meetingData;
        }

        if (!meeting) {
          smartToast.error("Meeting not found. It may have been deleted.");
          return;
        }

        // Only allow join if meeting is currently active (based on time + status)
        if (!isMeetingCurrentlyActive(meeting)) {
          smartToast.error("This meeting is not currently active.");
          return;
        }

        console.log("✅ Meeting is active, proceeding with join...");
      } catch (checkError) {
        console.warn("⚠️ Could not verify meeting status:", checkError);
        smartToast.error("Could not verify meeting status. Please try again.");
        return;
      }

      // Join the meeting
      await api.post(`/meeting/${dynamicMeetingId}/join`);

      smartToast.success("Successfully joined the meeting!");

      // Navigate to meetings page after successful join
      navigate('/meetings', { state: { meetingId: dynamicMeetingId, groupId } });
    } catch (error) {
      console.error("❌ Error joining meeting:", error);
      smartToast.error(
        error.response?.data?.message || error.message || "Failed to join meeting. Please try again."
      );
    }
  };

  // Determine whether the group has a currently active meeting
  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const checkMeetingExists = async () => {
      try {
        // If we already know about a meeting from props / groupInfo,
        // only treat it as "joinable" when it is currently active.
        const candidateMeeting =
          groupInfo?.meeting ||
          groupInfo?.group?.meeting ||
          null;

        // If we already have meeting info attached to the group,
        // prefer it, but still ensure it is currently active.
        if (candidateMeeting && isMeetingCurrentlyActive(candidateMeeting)) {
          if (!cancelled) {
            setHasMeeting(true);
            setActiveMeetingIdForGroup(
              candidateMeeting?.id || candidateMeeting?.meeting_id || candidateMeeting?.meetingId || null
            );
          }
          return;
        }

        if (!groupId) {
          if (!cancelled) {
            setHasMeeting(false);
            setActiveMeetingIdForGroup(null);
          }
          return;
        }

        const res = await api.get("/meeting", { params: { group_id: groupId } });
        const root = res?.data;
        const nested = root?.data && (root?.success === undefined) ? root?.data : null;
        const effective = nested || root;
        const payload = effective?.data ?? effective;
        const meetings = Array.isArray(payload) ? payload : payload ? [payload] : [];

        if (!meetings || meetings.length === 0) {
          if (!cancelled) {
            setHasMeeting(false);
            setActiveMeetingIdForGroup(null);
          }
          return;
        }

        // Only consider meetings that are currently active (time window + status)
        const active = meetings.find((m) => isMeetingCurrentlyActive(m));

        if (!cancelled) {
          setHasMeeting(!!active);
          const mid = active?.id || active?.meeting_id || active?.meetingId || null;
          setActiveMeetingIdForGroup(mid);
        }
      } catch (err) {
        console.warn('Could not determine group meetings', err);
        if (!cancelled) setHasMeeting(false);
      }
    };

    // Initial check
    checkMeetingExists();

    // Poll periodically so that when an admin creates / updates a meeting,
    // the "Join Meeting" button appears/disappears without requiring a refresh.
    if (groupId) {
      intervalId = setInterval(checkMeetingExists, 10000); // every 10s
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [groupId, groupInfo, meetingId]);

  // Listen for meeting end event from socket
  useEffect(() => {
    if (!socket || !groupId) return;

    const onMeetingEnded = (data) => {
      // Only apply to this group
      if (data?.groupId === groupId || !data?.groupId) {
        setHasMeeting(false);
        setActiveMeetingIdForGroup(null);
        setIsInMeeting(false);
      }
    };

    socket.on("meetingEnded", onMeetingEnded);

    return () => {
      socket.off("meetingEnded", onMeetingEnded);
    };
  }, [socket, groupId]);

  // Sync isInMeeting: true when we're in this group's meeting (sessionStorage has matching id)
  useEffect(() => {
    const sync = () => {
      try {
        const stored = sessionStorage.getItem("activeMeetingId");
        const match =
          activeMeetingIdForGroup &&
          stored &&
          String(activeMeetingIdForGroup) === String(stored);
        setIsInMeeting(!!match);
      } catch {
        setIsInMeeting(false);
      }
    };
    sync();
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [activeMeetingIdForGroup]);

  const messagesContainerRef = useRef(null);
  const mainChatRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const messagesEndRef = useRef(null);
  const [modalPhoto, setModalPhoto] = useState(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const isUserAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const lastOpenedGroupIdRef = useRef(null);
  const pendingInitialScrollRef = useRef(false);
  const [contentTab, setContentTab] = useState("media");
  const [mediaTab, setMediaTab] = useState("media");

  // Function to format messages and add link media items
  const formatMessages = (msgs) => {
    // Filter out deleted messages first
    const nonDeletedMsgs = msgs.filter((msg) => !msg.is_deleted);

    return nonDeletedMsgs.map((msg) => {
      const formattedMsg = { ...msg };
      const media = Array.isArray(msg.media) ? [...msg.media] : [];

      if (msg.message) {
        const urlRegex = /https?:\/\/[^\s<>,;]+/g;
        const urls = msg.message.match(urlRegex) || [];

        urls.forEach((url, index) => {
          try {
            const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
            const isFileUrl =
              /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(
                cleanUrl
              );

            if (!isFileUrl) {
              const hostname = new URL(cleanUrl).hostname.replace("www.", "");
              const linkMediaItem = {
                id: `link-${msg.id}-${index}`,
                media_url: cleanUrl,
                file_name: hostname,
                media_type: "link",
                created_at: msg.created_at,
                sender_name: msg.sender_name,
              };
              media.push(linkMediaItem);
            }
          } catch (e) {
            console.warn("Invalid URL in message:", url, e);
          }
        });
      }

      formattedMsg.media = media;
      return formattedMsg;
    });
  };

  const sortMessagesChronologically = (msgs) => {
    if (!Array.isArray(msgs)) return [];
    return [...msgs].sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
  };

  const [messages, setMessages] = useState(() => {
    if (!Array.isArray(initialMessages)) {
      console.warn("initialMessages is not an array:", initialMessages);
      return [];
    }
    console.log("Initial messages count:", initialMessages.length);
    return sortMessagesChronologically(formatMessages(initialMessages));
  });

  // Check if user is at the bottom of the chat
  const checkIfAtBottom = () => {
    if (!messagesContainerRef.current) return false;
    const container = messagesContainerRef.current;
    const threshold = 100;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    return isAtBottom;
  };

  const scrollToBottom = (force = false, instant = false) => {
    if (!messagesContainerRef.current) return;

    if (force || isUserAtBottom) {
      const container = messagesContainerRef.current;
      if (instant) {
        // Instant scroll - set scrollTop directly (no animation)
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = Math.max(
              0,
              container.scrollHeight - container.clientHeight
            );
          }
        });
      } else {
        // Smooth scroll for new messages
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      setIsUserAtBottom(atBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    isUserAtBottomRef.current = isUserAtBottom;
  }, [isUserAtBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleLoad = () => {
      if (!isUserAtBottomRef.current) return;
      requestAnimationFrame(() => {
        if (!messagesContainerRef.current) return;
        const c = messagesContainerRef.current;
        c.scrollTop = Math.max(0, c.scrollHeight - c.clientHeight);
      });
    };

    container.addEventListener("load", handleLoad, true);
    return () => {
      container.removeEventListener("load", handleLoad, true);
    };
  }, []);

  useEffect(() => {
    const currentMessagesLength = messages.length;
    const prevMessagesLength = prevMessagesLengthRef.current;

    if (currentMessagesLength > prevMessagesLength && isUserAtBottom) {
      scrollToBottom(true);
    }

    prevMessagesLengthRef.current = currentMessagesLength;
  }, [messages, isUserAtBottom]);

  useEffect(() => {
    const shouldOpenOnThisViewport = showMainChat || !isMobile;
    const hasGroup = !!groupId;

    if (!shouldOpenOnThisViewport || !hasGroup) return;

    const isNewGroup = String(lastOpenedGroupIdRef.current) !== String(groupId);

    if (isNewGroup) {
      lastOpenedGroupIdRef.current = groupId;
    }

    if (!isNewGroup && isMobile && !showMainChat) return;

    const run = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      container.scrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      setIsUserAtBottom(true);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });

    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showMainChat, isMobile, groupId]);

  useEffect(() => {
    const shouldOpenOnThisViewport = showMainChat || !isMobile;
    if (!shouldOpenOnThisViewport || !groupId) return;
    pendingInitialScrollRef.current = true;
  }, [groupId, showMainChat, isMobile]);

  // Handle swipe back gesture on mobile
  useEffect(() => {
    if (!isMobile || !showMainChat || !mainChatRef.current) return;
    // Need either onBackToChats or onCloseSection depending on whether a section is open
    if (!onBackToChats && !onCloseSection) return;

    const mainChat = mainChatRef.current;
    const MIN_SWIPE_DISTANCE = 60; // Minimum distance to trigger (reduced for real devices)
    const MAX_VERTICAL_MOVEMENT = 100; // Max vertical movement to consider it horizontal

    const handleTouchStart = (e) => {
      // Only handle single touch
      if (e.touches.length !== 1) return;

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!touchStartX.current || !touchStartY.current || e.touches.length !== 1) return;

      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const diffX = touchCurrentX - touchStartX.current;
      const diffY = touchCurrentY - touchStartY.current;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);

      // Check if it's a horizontal swipe right (more horizontal than vertical)
      // Allow some vertical movement but prioritize horizontal
      if (diffX > 20 && absDiffX > absDiffY && absDiffY < MAX_VERTICAL_MOVEMENT) {
        // Only prevent default for significant horizontal movement to allow scrolling
        if (absDiffX > 30) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (!touchStartX.current || !touchStartY.current) {
        touchStartX.current = 0;
        touchStartY.current = 0;
        return;
      }

      const touchEndX = e.changedTouches[0]?.clientX || 0;
      const touchEndY = e.changedTouches[0]?.clientY || 0;
      const diffX = touchEndX - touchStartX.current;
      const diffY = touchEndY - touchStartY.current;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);

      // Handle horizontal swipe right (swipe right to go back)
      // Check if it's a clear horizontal swipe with minimum distance
      if (diffX > MIN_SWIPE_DISTANCE && absDiffX > absDiffY && absDiffY < MAX_VERTICAL_MOVEMENT) {
        // If a section is open (media/videos), close it and go back to chat
        if (activeSection && onCloseSection) {
          onCloseSection();
        }
        // Otherwise, go back to chat panel
        else if (onBackToChats) {
          onBackToChats();
        }
      }

      touchStartX.current = 0;
      touchStartY.current = 0;
    };

    // Attach listeners with passive: true for start/end for better performance
    mainChat.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainChat.addEventListener('touchmove', handleTouchMove, { passive: false });
    mainChat.addEventListener('touchend', handleTouchEnd, { passive: true });
    mainChat.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      mainChat.removeEventListener('touchstart', handleTouchStart);
      mainChat.removeEventListener('touchmove', handleTouchMove);
      mainChat.removeEventListener('touchend', handleTouchEnd);
      mainChat.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMobile, showMainChat, onBackToChats, onCloseSection, activeSection]);

  useEffect(() => {
    if (!initialMessages || !Array.isArray(initialMessages)) return;

    const formattedNew = sortMessagesChronologically(
      formatMessages(initialMessages)
    );
    setMessages(formattedNew);

    // Scroll to bottom instantly when messages are loaded (no animation)
    // Use multiple requestAnimationFrame to ensure DOM is fully rendered
    const run = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      setIsUserAtBottom(true);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });

    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [initialMessages]);

  useEffect(() => {
    const shouldOpenOnThisViewport = showMainChat || !isMobile;
    if (!shouldOpenOnThisViewport || !groupId) return;
    pendingInitialScrollRef.current = true;
  }, [initialMessages, groupId, showMainChat, isMobile]);

  useLayoutEffect(() => {
    if (!pendingInitialScrollRef.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const run = () => {
      const c = messagesContainerRef.current;
      if (!c) return;
      c.scrollTop = Math.max(0, c.scrollHeight - c.clientHeight);
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      setIsUserAtBottom(true);
    };

    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });

    const t1 = setTimeout(run, 100);
    const t2 = setTimeout(run, 400);
    const t3 = setTimeout(run, 1000);
    const t4 = setTimeout(() => {
      pendingInitialScrollRef.current = false;
    }, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [messages, groupId]);

  useEffect(() => {
    setContentTab("media");
    setMediaTab("media");
  }, [activeSection]);

  const members = Array.isArray(groupMembers) ? groupMembers : [];

  // Extract links from messages
  const messageLinks = useMemo(() => {
    const links = [];

    messages?.forEach((msg) => {
      if (msg.is_deleted || !msg.message) return;

      const urlRegex = /https?:\/\/[^\s<>,;]+/g;
      const urls = msg.message.match(urlRegex) || [];

      urls.forEach((url) => {
        try {
          const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
          const isFileUrl =
            /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(
              cleanUrl
            );

          if (!isFileUrl) {
            const domain = new URL(cleanUrl).hostname.replace("www.", "");
            links.push({
              id: `msg-${msg.id}-${cleanUrl}`,
              media_url: cleanUrl,
              file_name: domain,
              original_url: cleanUrl,
              created_at: msg.created_at,
              sender_name: msg.sender_name,
              message_id: msg.id,
              isLink: true,
            });
          }
        } catch (e) {
          console.warn("Invalid URL in message:", url, e);
        }
      });
    });

    return links;
  }, [messages]);

  // Combine links from backend (groupMediaItems.links) with links extracted from messages
  // Backend saves links from WhatsApp messages in the media field
  const allLinks = useMemo(() => {
    const backendLinks = groupMediaItems?.links || [];
    const extractedLinks = messageLinks || [];

    // Create a Set to track unique URLs (normalize URLs for comparison)
    const seenUrls = new Set();
    const combinedLinks = [];

    // First, add backend links (these are from WhatsApp messages saved by backend)
    backendLinks.forEach((link) => {
      const url = link.media_url || link.file_url || "";
      if (url) {
        try {
          // Normalize URL for comparison (remove trailing slashes, query params, etc.)
          const normalizedUrl = new URL(url).href.toLowerCase().replace(/\/$/, "");
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            combinedLinks.push({
              ...link,
              isLink: true,
            });
          }
        } catch (e) {
          // If URL parsing fails, still add it if not seen
          if (!seenUrls.has(url.toLowerCase())) {
            seenUrls.add(url.toLowerCase());
            combinedLinks.push({
              ...link,
              isLink: true,
            });
          }
        }
      }
    });

    // Then, add extracted message links (avoiding duplicates)
    extractedLinks.forEach((link) => {
      const url = link.media_url || link.original_url || "";
      if (url) {
        try {
          const normalizedUrl = new URL(url).href.toLowerCase().replace(/\/$/, "");
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            combinedLinks.push(link);
          }
        } catch (e) {
          if (!seenUrls.has(url.toLowerCase())) {
            seenUrls.add(url.toLowerCase());
            combinedLinks.push(link);
          }
        }
      }
    });

    return combinedLinks;
  }, [groupMediaItems?.links, messageLinks]);

  const mediaTabResources = useMemo(
    () => ({
      photos: [...(groupMediaItems?.images || [])],
      videos: [...(groupMediaItems?.videos || [])],
      audio: [...(groupMediaItems?.audio || [])],
      links: allLinks,
      documents: [...(groupMediaItems?.files || [])],
    }),
    [groupMediaItems, allLinks]
  );

  // Legacy support for groupInfo-based resources (from first file)
  const { photos, links, documents, audio } = groupInfo?.content?.resources
    ? categorizeResources(groupInfo.content.resources)
    : { photos: [], links: [], documents: [], audio: [] };

  const handlePhotoClick = (item) => {
    console.log("Clicked item:", item);

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

    // For audio files, open in new tab to play, don't open media modal
    if (isAudio) {
      window.open(url, "_blank");
      return;
    }

    const mediaItem = {
      media_url: url,
      file_url: url,
      file_name: item.file_name || "Media",
      media_type: isImage ? "image" : isVideo ? "video" : "file",
    };

    setModalPhoto(mediaItem);
  };

  const closeModal = () => {
    setModalPhoto(null);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!groupId) {
      smartToast.error("Group ID is missing");
      return;
    }
    try {
      const response = await deleteMessage(groupId, messageId);
      console.log("Delete message response:", response);

      // Mark message as deleted locally
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, is_deleted: true } : msg
        )
      );

      // Notify parent to mark in GroupChat's messages
      if (onMessageDeleted) {
        onMessageDeleted(messageId);
      }

      smartToast.success("Message deleted successfully");
    } catch (error) {
      smartToast.error("Failed to delete message");
      console.error("Error deleting message:", error);
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!groupId) return;
    if (!newText || !newText.trim()) return;

    const trimmedText = newText.trim();

    try {
      // Call the edit API - PUT /chat/groups/{groupId}/messages/{messageId}
      const response = await updateMessage(groupId, messageId, trimmedText);

      // The API should return the updated message object
      let updatedMessage = null;
      if (response && response.data) {
        updatedMessage = response.data;
      } else if (response && typeof response === "object") {
        updatedMessage = response;
      }

      if (updatedMessage && updatedMessage.id) {
        // Find the original message to preserve all its properties
        const originalMessage = messages.find((msg) => msg.id === messageId);

        // Create updated message with new text, preserving all other properties
        // Handle both 'message' and 'text' properties to ensure compatibility
        const messageWithNewText = {
          ...originalMessage,
          ...updatedMessage,
          message: trimmedText,
          text: trimmedText, // Ensure both message and text are set
        };

        // If the API response has 'text' instead of 'message', use that
        if (updatedMessage.text && !updatedMessage.message) {
          messageWithNewText.message = updatedMessage.text;
        } else if (updatedMessage.message && !updatedMessage.text) {
          messageWithNewText.text = updatedMessage.message;
        }

        // Format the updated message with media and links
        const formattedUpdatedMessage = formatMessages([messageWithNewText])[0];

        // Update only the specific message in the local state
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId ? formattedUpdatedMessage : msg
          )
        );

        smartToast.success("Message updated successfully");

        // Call the callback if provided
        if (onMessageEdited) onMessageEdited(messageId, trimmedText);
      } else {
        throw new Error("Invalid response from update API");
      }
    } catch (error) {
      smartToast.error("Failed to edit message");
      console.error("Error editing message:", error);
    }
  };

  const getDownloadFileName = (item) => {
    const getExtensionFromFileType = (fileType) => {
      if (!fileType) return null;

      const typeMap = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          "docx",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          "xlsx",
        "application/vnd.ms-powerpoint": "ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation":
          "pptx",
        "text/plain": "txt",
        "text/csv": "csv",
        "application/zip": "zip",
        "application/x-rar-compressed": "rar",
        "application/x-zip-compressed": "zip",
      };

      if (typeMap[fileType]) {
        return typeMap[fileType];
      }

      const parts = fileType.split("/");
      if (parts.length === 2) {
        const subtype = parts[1].split(";")[0].trim();
        if (subtype && subtype.length <= 5 && !subtype.includes(".")) {
          return subtype;
        }
      }

      return null;
    };

    const getExtensionFromUrl = (url) => {
      if (!url) return null;
      try {
        const cleanUrl = url.split("?")[0].split("#")[0];
        const match = cleanUrl.match(/\.([a-zA-Z0-9]{1,5})$/);
        return match ? match[1].toLowerCase() : null;
      } catch (e) {
        return null;
      }
    };

    const getExtensionFromFileName = (fileName) => {
      if (!fileName) return null;
      const match = fileName.match(/\.([a-zA-Z0-9]{1,5})$/);
      return match ? match[1].toLowerCase() : null;
    };

    let extension = getExtensionFromFileType(item.file_type);

    if (!extension) {
      extension = getExtensionFromUrl(item.file_url);
    }

    if (!extension) {
      extension = getExtensionFromFileName(item.file_name);
    }

    if (item.file_name) {
      const existingExt = getExtensionFromFileName(item.file_name);
      if (existingExt) {
        return item.file_name;
      }
      return extension ? `${item.file_name}.${extension}` : item.file_name;
    } else {
      if (item.file_url) {
        try {
          const urlPath = item.file_url.split("?")[0].split("#")[0];
          const urlParts = urlPath.split("/");
          const lastPart = urlParts[urlParts.length - 1];

          if (lastPart && lastPart.includes(".")) {
            return lastPart;
          } else if (lastPart) {
            return extension ? `${lastPart}.${extension}` : lastPart;
          }
        } catch (e) {
          // Fall through to default
        }
      }
      return extension ? `document.${extension}` : "document";
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const renderMembersSection = () => {
    const sortedMembers = [...members].sort((a, b) => {
      if (a.role === "Administrator" && b.role !== "Administrator") return -1;
      if (a.role !== "Administrator" && b.role === "Administrator") return 1;
      return 0;
    });

    return (
      <div className="expanded-section1">
        <h4>Members</h4>
        <div className="members-list">
          {sortedMembers.map((member) => (
            <div key={member.id} className="member-item">
              {member.user_photo ? (
                <img
                  src={member.user_photo}
                  alt={member.name}
                  className="member-avatar"
                />
              ) : (
                <div className="member-avatar-fallback">
                  {getInitials(member.name || member.email || "U")}
                </div>
              )}

              <div>
                <h5>{member.name}</h5>
                <p>{member.email}</p>
              </div>
              <span
                className={`member-role ${member.role === "Administrator" ? "admin-role" : ""
                  }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderResourceGrid = (items = []) => (
    <div className="expanded-items">
      {items.length === 0 && <p className="empty-state">No items yet.</p>}
      {items.map((item, index) => {
        const url = item.media_url || item.file_url;
        const isImage =
          /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
          item.media_type?.startsWith("image") ||
          item.file_type?.startsWith("image/");
        const isVideo =
          /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(url) ||
          item.media_type?.startsWith("video") ||
          item.file_type?.startsWith("video/");
        const isAudio =
          /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url) ||
          item.media_type?.startsWith("audio") ||
          item.media_type === "voice" ||
          item.media_type === "voice_note" ||
          item.file_type?.startsWith("audio/");

        return (
          <div
            key={item.id || index}
            className={`media-item ${isImage
              ? "media-item-photo"
              : isVideo
                ? "media-item-video"
                : isAudio
                  ? "media-item-audio"
                  : ""
              }`}
            onClick={() => handlePhotoClick(item)}
          >
            {isImage ? (
              <img
                src={url}
                className="expanded-photo"
                alt={item.file_name || "media"}
              />
            ) : isVideo ? (
              <div className="video-thumbnail">
                <video src={url} className="expanded-video" preload="metadata">
                  Your browser does not support the video tag.
                </video>
                <div className="video-play-overlay">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="white"
                    opacity="0.9"
                  >
                    <path d="M18 32V16l12 8-12 8z" />
                  </svg>
                </div>
              </div>
            ) : isAudio ? (
              <div className="voice-note-card">
                <div className="voice-note-header">
                  <div className="voice-note-icon-wrapper">
                    <Microphone size={20} weight="fill" />
                  </div>
                  <div className="voice-note-title">
                    <span className="voice-note-label">Voice Note</span>
                    <span className="voice-note-filename">
                      {item.file_name || "Recording"}
                    </span>
                  </div>
                </div>
                <div className="voice-note-waveform">
                  {Array.from({ length: 40 }, (_, i) => (
                    <div
                      key={i}
                      className="voice-note-bar"
                      style={{
                        height: `${20 + Math.random() * 60}%`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="voice-note-play-button">
                  <Play size={16} weight="fill" />
                </div>
              </div>
            ) : (
              <div className="media-placeholder">
                <File size={24} />
                <span>{item.file_name || "Media"}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderLinkList = (items = []) => {
    console.log("Rendering links:", items);
    return (
      <div className="expanded-items expanded-links">
        {items.length === 0 && <p className="empty-state">No links yet.</p>}
        {items.map((item, index) => (
          <a
            key={item.id || index}
            href={item.media_url || item.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-item"
            onClick={(e) => {
              e.preventDefault();
              console.log("Opening link:", item.media_url || item.file_url);
              window.open(
                item.media_url || item.file_url,
                "_blank",
                "noopener,noreferrer"
              );
            }}
          >
            <span className="link-title">{item.file_name}</span>
            <span
              className="link-url"
              title={item.original_url || item.media_url || item.file_url}
            >
              {item.original_url || item.media_url || item.file_url}
            </span>
          </a>
        ))}
      </div>
    );
  };

  const renderDocumentList = (items = []) => {
    const getFileExtension = (fileName) => {
      if (!fileName) return "FILE";
      const parts = fileName.split(".");
      if (parts.length > 1) {
        const ext = parts[parts.length - 1].toUpperCase();
        return ext.length <= 4 ? ext : "FILE";
      }
      return "FILE";
    };

    return (
      <div className="expanded-items documents-grid">
        {items.length === 0 && <p className="empty-state">No documents yet.</p>}
        {items.map((item, index) =>
          item.media_type === "audio" ? (
            <div key={item.id || index} className="document-item audio-item">
              <audio controls src={item.media_url || item.file_url} />
              <span>{item.file_name || "Audio"}</span>
            </div>
          ) : (
            (() => {
              const fileName = getDownloadFileName(item);
              const fileUrl = item.file_url || item.media_url;

              const handleDownload = async (e) => {
                e.preventDefault();
                try {
                  const token =
                    localStorage.getItem("token") ||
                    sessionStorage.getItem("token");
                  const response = await fetch(fileUrl, {
                    method: "GET",
                    headers: token
                      ? {
                        Authorization: `Bearer ${token}`,
                      }
                      : {},
                  });

                  if (!response.ok) {
                    throw new Error("Failed to download file");
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Error downloading file:", error);
                  // Fallback to opening in new tab
                  window.open(fileUrl, "_blank");
                }
              };

              return (
                <a
                  key={item.id || index}
                  href={fileUrl}
                  onClick={handleDownload}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="document-item document-square"
                  title={fileName}
                >
                  <div className="document-icon">
                    <span className="document-extension">
                      {getFileExtension(fileName)}
                    </span>
                  </div>
                  <div className="document-name">{fileName}</div>
                </a>
              );
            })()
          )
        )}
      </div>
    );
  };

  const renderTabbedSection = (source, tabValue, onTabChange) => (
    <div className="expanded-section">
      <div className="tabs-header">
        <button
          className={`tab-item ${tabValue === "media" ? "active" : ""}`}
          onClick={() => onTabChange("media")}
        >
          Media
        </button>
        <button
          className={`tab-item ${tabValue === "audios" ? "active" : ""}`}
          onClick={() => onTabChange("audios")}
        >
          Audios
        </button>
        <button
          className={`tab-item ${tabValue === "links" ? "active" : ""}`}
          onClick={() => onTabChange("links")}
        >
          Links
        </button>
        <button
          className={`tab-item ${tabValue === "documents" ? "active" : ""}`}
          onClick={() => onTabChange("documents")}
        >
          Documents
        </button>
      </div>

      {tabValue === "media" &&
        renderResourceGrid([
          ...(source?.photos || []),
          ...(source?.videos || []),
        ])}
      {tabValue === "audios" && renderResourceGrid(source?.audio || [])}
      {tabValue === "links" && renderLinkList(source?.links)}
      {tabValue === "documents" && renderDocumentList(source?.documents)}
    </div>
  );

  // Legacy support for old expandedSection prop
  const renderLegacyExpandedSection = () => {
    if (!expandedSection) return null;

    let items = [];
    let title = "";

    switch (expandedSection) {
      case "photos":
        items = photos;
        title = "Photos";
        break;
      case "links":
        items = links;
        title = "Links";
        break;
      case "documents":
        items = documents;
        title = "Documents";
        break;
      default:
        return null;
    }

    return (
      <div className="expanded-section">
        <h4>{title}</h4>
        <div
          className={`expanded-items ${expandedSection === "links" ? "expanded-links" : ""
            }`}
        >
          {items.length === 0 ? (
            <p>No {title.toLowerCase()} available.</p>
          ) : (
            items.map((item, index) => (
              <div key={index} className="expanded-item">
                {expandedSection === "photos" && (
                  <img
                    src={item.file_url}
                    alt={item.file_name || "Photo"}
                    className="expanded-photo"
                    onClick={() => handlePhotoClick(item)}
                  />
                )}
                {expandedSection === "links" && (
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-item"
                  >
                    {item.file_url}
                  </a>
                )}
                {expandedSection === "documents" && (
                  <a
                    href={item.file_url}
                    download={getDownloadFileName(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.file_name || getDownloadFileName(item)}
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderExpandedSection = () => {
    // New tabbed section support
    if (activeSection) {
      if (activeSection === "members") return renderMembersSection();
      if (activeSection === "media")
        return renderTabbedSection(mediaTabResources, mediaTab, setMediaTab);
      return renderTabbedSection(contentResources, contentTab, setContentTab);
    }

    // Legacy support for old expandedSection
    return renderLegacyExpandedSection();
  };

  return (
    <div
      ref={mainChatRef}
      className={`main-chat rounded-4 shadow-sm ${isMobile && !showMainChat ? "mobile-hidden" : ""
        }`}
    >
      <div className="chat-header">
        {/* Show section back button if viewing a section, otherwise show mobile back button */}
        {activeSection || expandedSection ? (
          <button
            className="back-to-chat-btn"
            onClick={
              onCloseSection ||
              (() => setExpandedSection && setExpandedSection(null))
            }
          >
            <ArrowLeft size={20} color="white" />
          </button>
        ) : (
          isMobile && (
            <button
              className="back-to-chats-btn"
              onClick={(e) => {
                console.log("🔵 Back button clicked (onClick)", {
                  onBackToChats: !!onBackToChats,
                  isMobile,
                });
                e.preventDefault();
                e.stopPropagation();
                if (onBackToChats) {
                  onBackToChats();
                }
              }}
              onTouchEnd={(e) => {
                console.log("🔵 Back button touched (onTouchEnd)", {
                  onBackToChats: !!onBackToChats,
                  isMobile,
                });
                e.preventDefault();
                e.stopPropagation();
                if (onBackToChats) {
                  onBackToChats();
                }
              }}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
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
            <button className="create-meeting-btn" onClick={onCreateMeeting} style={{
              background: "#0076EA",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              marginRight: "8px"
            }}>Create Meeting</button>
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
      <div className="chat-messages" ref={messagesContainerRef}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading messages...</p>
          </div>
        ) : (
          <>
            {(() => {
              // console.log('Render check:', {
              //     activeSection,
              //     expandedSection,
              //     groupId,
              //     messagesLength: messages.length,
              //     messagesArray: Array.isArray(messages)
              // });
              return null;
            })()}
            {activeSection || expandedSection ? (
              renderExpandedSection()
            ) : !groupId ? (
              <>
                <div className="no-messages-container">
                  <img
                    src="/assets/GroupChat.png"
                    alt="No chat selected"
                    className="no-messages-image"
                  />
                  <p className="no-messages-text fw-semibold mt-3">
                    No chats selected yet!
                  </p>
                </div>
                <p
                  style={{
                    color: "#888888",
                    textAlign: "center",
                    marginTop: "auto",
                    padding: "1rem",
                  }}
                >
                  Select chat to start a conversation
                </p>
              </>
            ) : messages.length === 0 ? (
              <div className="no-messages-container">
                <img
                  src="/assets/GroupChat.png"
                  alt="No messages"
                  className="no-messages-image"
                />
              </div>
            ) : (
              <>
                {Array.isArray(messages) && messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const msgDate =
                      msg.date ||
                      new Date(msg.created_at || Date.now()).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" }
                      );
                    const prevDate =
                      index > 0
                        ? messages[index - 1].date ||
                        new Date(
                          messages[index - 1].created_at || Date.now()
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                        : null;
                    const showSeparator = index === 0 || prevDate !== msgDate;

                    return (
                      <React.Fragment key={msg.id || `msg-${index}`}>
                        {showSeparator && (
                          <div className="date-separator-wrapper">
                            <div className="date-separator">{msgDate}</div>
                          </div>
                        )}
                        <MessageItem
                          message={msg}
                          groupId={groupId}
                          onDeleteMessage={handleDeleteMessage}
                          onEditMessage={handleEditMessage}
                          currentUserEmail={currentUserEmail}
                          onMediaClick={handlePhotoClick}
                          userRole={userRole}
                        />
                        {/* Debug: {JSON.stringify({ id: msg.id, hasText: !!msg.text, hasMessage: !!msg.message })} */}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="no-messages-container">
                    <img
                      src="/assets/GroupChat.png"
                      alt="No messages"
                      className="no-messages-image"
                    />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </>
        )}
      </div>
      {!activeSection && !expandedSection && groupId && !isSuperAdmin && (
        <ChatInput onSendMessage={onSendMessage} isSending={isSendingMessage} />
      )}
      {modalPhoto && (
        <div className="photo-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="photo-modal-close" onClick={closeModal}>
              ×
            </button>
            {modalPhoto.media_type?.startsWith("image") ? (
              <img
                src={modalPhoto.file_url || modalPhoto.media_url}
                alt={modalPhoto.file_name || "Photo"}
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
              />
            ) : modalPhoto.media_type?.startsWith("video") ? (
              <video
                controls
                src={modalPhoto.media_url || modalPhoto.file_url}
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
              />
            ) : (
              <a
                href={modalPhoto.media_url || modalPhoto.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "blue", textDecoration: "underline" }}
              >
                Open {modalPhoto.file_name || "file"}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainChat;
