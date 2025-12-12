import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
//import { io } from 'socket.io-client';
import './GroupChat.css';
import ChatsPanel from './components/ChatsPanel';
import MainChat from './components/MainChat';
import RightSidebar from './components/RightSidebar';
import { categorizeResources, categorizeMediaItems } from './components/utils';

import axiosInstance from '../../API/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import { smartToast } from '../../API/toastManager';

//const SERVER_URL = "https://meetza-backend.vercel.app";

const MEDIA_TYPE_MAP = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'],
  video: ['mp4', 'mov', 'webm', 'mkv'],
  audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm']
};

const MIME_EXTENSION_MAP = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'video/webm': 'webm',
  'video/mp4': 'mp4'
};

const deriveExtensionFromMime = (mime) => {
  if (!mime) return '';
  const cleanMime = mime.split(';')[0]?.trim().toLowerCase();
  if (MIME_EXTENSION_MAP[cleanMime]) {
    return MIME_EXTENSION_MAP[cleanMime];
  }
  if (cleanMime.includes('/')) {
    const subtype = cleanMime.split('/')[1];
    if (subtype === 'plain') return 'txt';
    if (subtype) {
      return subtype;
    }
  }
  return '';
};

const extractExtension = (mediaItem) => {
  const fromName = mediaItem?.file_name?.split('.').pop();
  if (fromName) {
    return fromName.toLowerCase();
  }

  const url = mediaItem?.media_url || mediaItem?.file_url || '';
  if (!url) return '';
  const cleanUrl = url.split('?')[0];
  if (cleanUrl.includes('.')) {
    return cleanUrl.split('.').pop().toLowerCase();
  }
  const mimeExt = deriveExtensionFromMime(mediaItem?.file_type || mediaItem?.media_type);
  return mimeExt || '';
};

const deriveMediaTypeFromExtension = (extension) => {
  if (!extension) return 'document';
  if (MEDIA_TYPE_MAP.image.includes(extension)) return 'image';
  if (MEDIA_TYPE_MAP.video.includes(extension)) return 'video';
  if (MEDIA_TYPE_MAP.audio.includes(extension)) return 'audio';
  return 'document';
};

const deriveFileName = (mediaItem) => {
  const extension = extractExtension(mediaItem) || deriveExtensionFromMime(mediaItem?.file_type || mediaItem?.media_type);

  const ensureExtension = (name) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (trimmed.includes('.') && trimmed.split('.').pop().length <= 6) {
      return trimmed;
    }
    if (extension) {
      return `${trimmed}.${extension}`;
    }
    return trimmed;
  };

  if (mediaItem?.file_name) {
    const normalized = ensureExtension(mediaItem.file_name);
    if (normalized) return normalized;
  }

  const url = mediaItem?.media_url || mediaItem?.file_url;
  if (url) {
    try {
      const parsed = new URL(url);
      const candidate = decodeURIComponent(parsed.pathname.split('/').pop() || '');
      if (candidate) {
        if (candidate.includes('.') || !extension) {
          return candidate;
        }
        return `${candidate}.${extension}`;
      }
    } catch (err) {
      const fallback = url.split('?')[0].split('/').pop();
      if (fallback) {
        if (fallback.includes('.') || !extension) {
          return fallback;
        }
        return `${fallback}.${extension}`;
      }
    }
  }

  if (extension) {
    return `document.${extension}`;
  }
  return 'document';
};

const normalizeMediaItems = (mediaItems, messageId) => {
  if (!Array.isArray(mediaItems)) return [];
  return mediaItems.map((item, index) => {
    const mediaUrl = item?.media_url || item?.file_url || '';
    const extension = extractExtension(item);

    const declaredType = typeof item?.media_type === 'string'
      ? item.media_type
      : (typeof item?.file_type === 'string' ? item.file_type : '');

    let normalizedType = declaredType?.toLowerCase() || '';
    if (normalizedType.startsWith('image')) {
      normalizedType = 'image';
    } else if (normalizedType.startsWith('video')) {
      normalizedType = 'video';
    } else if (normalizedType.startsWith('audio') || normalizedType === 'voice' || normalizedType === 'voice_note') {
      normalizedType = 'audio';
    } else if (!normalizedType || normalizedType === 'file' || normalizedType === 'document') {
      normalizedType = deriveMediaTypeFromExtension(extension);
    } else {
      normalizedType = deriveMediaTypeFromExtension(extension) || 'document';
    }

    return {
      ...item,
      id: item?.id || `${messageId || 'msg'}-media-${index}`,
      media_url: mediaUrl,
      file_url: mediaUrl,
      file_name: deriveFileName(item),
      media_type: normalizedType
    };
  });
};

//const SERVER_URL = "https://meetza-backend.vercel.app";

export default function GroupChat() {
  const { user } = useContext(AuthContext);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMainChat, setShowMainChat] = useState(false);
  // sockets disabled — using HTTP polling for live updates
  //const [socket, setSocket] = useState(null);
  //const [socketStatus, setSocketStatus] = useState('disconnected');
  const [groupChats, setGroupChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeInfoSection, setActiveInfoSection] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showRightSidebarMobile, setShowRightSidebarMobile] = useState(false);
  // Track which groups we've already marked as read to prevent loops
  const markedAsReadRef = React.useRef(new Set());
  // Track which groups have been opened/read in this session - always keep unread at 0 for these
  const readGroupsRef = React.useRef(new Set());
  // Track previous message IDs to detect new messages during polling
  const previousMessageIdsRef = React.useRef(new Set());

  const formatMessage = useCallback((msg) => ({
    id: msg.id,
    sender: msg.sender_name,
    initials: msg.sender_name?.charAt(0)?.toUpperCase() || 'U',
    time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    date: msg.created_at ? new Date(msg.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    created_at: msg.created_at || new Date().toISOString(),
    text: msg.message,
    senderPhoto: msg.sender_photo,
    senderEmail: msg.sender_email,
    media: normalizeMediaItems(msg.media, msg.id),
    is_read: msg.is_read,
    read_at: msg.read_at
  }), []);

  const deriveMediaCategory = useCallback((file, fallbackCategory) => {
    if (fallbackCategory && fallbackCategory !== 'file') {
      return fallbackCategory;
    }
    const mime = file?.type || '';
    if (mime.startsWith('image')) return 'image';
    if (mime.startsWith('video')) return 'video';
    if (mime.startsWith('audio')) return 'audio';
    return 'document';
  }, []);

  const extractLinksFromMessages = (messages = []) => {
    console.log('Processing messages for links:', messages);
    const links = [];
    messages?.forEach(msg => {
      // Skip if message is deleted or has media (we only want plain text messages with links)
      if (msg.is_deleted || (msg.media && msg.media.length > 0)) {
        console.log('Skipping message (deleted or has media):', msg.id, {
          is_deleted: msg.is_deleted,
          has_media: msg.media?.length > 0
        });
        return;
      }

      if (msg.message) {
        console.log('Checking message for URLs:', {
          id: msg.id,
          message: msg.message
        });
        const urlRegex = /https?:\/\/[^\s<>,;]+/g;
        const urls = msg.message.match(urlRegex) || [];
        console.log('Found URLs:', urls);

        urls.forEach(url => {
          try {
            const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
            const isFileUrl = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(cleanUrl);

            if (!isFileUrl) {
              const urlObj = new URL(cleanUrl);
              const linkData = {
                id: `link-${msg.id}-${cleanUrl}`,
                media_url: cleanUrl,
                file_name: urlObj.hostname.replace('www.', ''),
                original_url: cleanUrl,
                created_at: msg.created_at,
                sender_name: msg.sender_name,
                message_id: msg.id,
                isLink: true,
                is_downloadable: false
              };
              console.log('Adding link:', linkData);
              links.push(linkData);
            } else {
              console.log('Skipping file URL:', cleanUrl);
            }
          } catch (e) {
            console.warn('Invalid URL:', url, e);
          }
        });
      }
    });
    console.log('Extracted links:', links);
    return links;
  };

  // Add class to body when GroupChat is mounted
  useEffect(() => {
    document.documentElement.classList.add('group-chat-active');
    document.body.classList.add('group-chat-active');

    return () => {
      document.documentElement.classList.remove('group-chat-active');
      document.body.classList.remove('group-chat-active');
    };
  }, []);

  // Define group event handler outside socket effect so it can be referenced in cleanup
  const groupEventNames = ['groupCreated', 'group_created', 'newGroup', 'new_group', 'group:add', 'group', 'groupUpdated'];

  const handleGroupEvent = async (payload) => {
    try {
      console.log('🔔 Group event received:', payload);

      let group = null;
      if (payload && typeof payload === 'object') {
        if (payload.id || payload.group_id || payload.groupId) {
          const id = payload.id || payload.group_id || payload.groupId;
          if (payload.group_name || payload.name) {
            group = { ...payload, id };
          } else {
            const res = await axiosInstance.get('/chat/groups');
            const list = res?.data?.data || [];
            group = list.find((g) => g.id === id || g.group_id === id || g.id === Number(id));
          }
        } else if (payload.group_name || payload.name) {
          group = payload;
        }
      }

      if (!group) {
        const res = await axiosInstance.get('/chat/groups');
        const list = res?.data?.data || [];
        const groupsWithContent = await Promise.all(
          list.map(async (g) => {
            let contentName = "No content";
            try {
              if (g.group_content_id) {
                const contentResponse = await axiosInstance.get(`/group-contents/${g.group_content_id}`);
                if (contentResponse.data && contentResponse.data.success) {
                  const data = contentResponse.data.data || {};
                  contentName = data.name || data.title || data.content_name || data.group_name || data.group_title || data.title_en || data.name_en || data.description || "No content";
                  if (!contentName || contentName === "No content") {
                    console.warn(`⚠️ No content name found for content id ${g.group_content_id}`, data);
                  }
                }
              }
            } catch (e) {
              console.warn('❌ Error fetching content for group during group-event refresh', e);
            }
            return { ...g, contentName };
          })
        );

        const formatted = groupsWithContent.map((g) => ({
          id: g.id,
          name: g.group_name,
          subject: g.last_message || 'No messages yet',
          avatar: g.group_name?.charAt(0)?.toUpperCase() || 'G',
          avatarImage: g.group_photo || null,
          date: g.last_message_at
            ? new Date(g.last_message_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short'
            })
            : new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short'
            }),
          unread: 0,
          group_name: g.group_name,
          group_content_id: g.group_content_id,
          contentName: g.contentName
        }));

        setGroupChats(formatted);
        return;
      }

      let contentName = group.contentName || group.content_name || group.title || group.name || 'No content';
      if (!contentName && group.group_content_id) {
        try {
          const contentResponse = await axiosInstance.get(`/group-contents/${group.group_content_id}`);
          if (contentResponse.data && contentResponse.data.success) {
            const data = contentResponse.data.data || {};
            contentName = data.name || data.title || data.content_name || data.group_name || data.group_title || data.title_en || data.name_en || data.description || 'No content';
          }
        } catch (e) {
          console.warn('❌ Error fetching content for new group', e);
        }
      }

      const formattedGroup = {
        id: group.id,
        name: group.group_name || group.name,
        subject: group.last_message || 'No messages yet',
        avatar: (group.group_name || group.name || 'G').charAt(0).toUpperCase(),
        avatarImage: group.group_photo || null,
        date: group.last_message_at ? new Date(group.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        unread: 0,
        group_name: group.group_name || group.name,
        group_content_id: group.group_content_id,
        contentName: contentName
      };

      setGroupChats((prev) => {
        const exists = prev.some((g) => String(g.id) === String(formattedGroup.id));
        if (exists) {
          return prev.map((g) => (String(g.id) === String(formattedGroup.id) ? formattedGroup : g));
        }
        return [formattedGroup, ...prev];
      });
    } catch (err) {
      console.error('❌ Error handling group event:', err);
    }
  };

  // Initialize Socket.IO using websocket-only transport (matches test-socket.js)
  /*useEffect(() => {
    let token = localStorage.getItem('token');
    if (!token) token = sessionStorage.getItem('token');
    if (!token) {
      console.log('⚠️ No token found, skipping Socket.IO');
      return;
    }

    console.log('🔌 Connecting to Socket.IO (websocket-only)...');

    const newSocket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setSocketStatus('connected');
    });

    newSocket.on('message', (msg) => {
      console.log('📨 New message:', msg);
      setMessages((prev) => [...prev, {
        id: msg.id,
        sender: msg.sender_name,
        initials: msg.sender_name?.charAt(0)?.toUpperCase() || 'U',
        time: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        text: msg.message,
        date: new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        senderPhoto: msg.sender_photo,
        senderEmail: msg.sender_email
      }]);

      // Update last_message in groupChats list
      if (msg.group_id) {
        setGroupChats((prev) =>
          prev.map((group) =>
            String(group.id) === String(msg.group_id)
              ? { ...group, subject: msg.message || 'No messages yet' }
              : group
          )
        );
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connect_error:', err?.message || err);
      setSocketStatus('error');
    });

    newSocket.on('error', (err) => {
      console.error('❌ Socket error:', err);
      setSocketStatus('error');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setSocketStatus('disconnected');
    });

    // Register for group events emitted by server
    groupEventNames.forEach((ename) => newSocket.on(ename, handleGroupEvent));

    setSocket(newSocket);

    return () => {
      try {
        groupEventNames.forEach((ename) => newSocket.off(ename, handleGroupEvent));
      } catch (e) {
        // ignore
      }
      newSocket.disconnect();
    };
  }, []);*/

  // Reusable function to fetch and format groups
  const refreshGroupsList = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const response = await axiosInstance.get('/chat/groups');
      if (response.data.success) {
        // Fetch content names for each group
        const groupsWithContent = await Promise.all(
          response.data.data.map(async (group) => {
            let contentName = "No content";
            try {
              if (group.group_content_id) {
                const contentResponse = await axiosInstance.get(
                  `/group-contents/${group.group_content_id}`
                );
                if (contentResponse.data && contentResponse.data.success) {
                  const data = contentResponse.data.data || {};
                  contentName = data.name || data.title || data.content_name || data.group_name || data.group_title || data.title_en || data.name_en || data.description || "No content";
                  if (!contentName || contentName === "No content") {
                    console.warn(`⚠️ No content name found for content id ${group.group_content_id}`, data);
                  }
                }
              }
            } catch (error) {
              console.error(`❌ Error fetching content for group ${group.id}:`, error);
            }
            return { ...group, contentName };
          })
        );

        // Format groups to match ChatItem component structure
        const formattedGroups = groupsWithContent.map((group) => ({
          id: group.id,
          name: group.group_name,
          subject: group.last_message || 'No messages yet',
          avatar: group.group_name?.charAt(0)?.toUpperCase() || 'G',
          avatarImage: group.group_photo || null,
          date: group.last_message_at
            ? new Date(group.last_message_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short'
            })
            : new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short'
            }),
          // Use unread count from API if available, otherwise default to 0
          unread: group.unread || group.unread_count || group.unreadCount || 0,
          group_name: group.group_name,
          group_content_id: group.group_content_id,
          contentName: group.contentName
        }));

        // Preserve the currently selected chat by ID when updating the list
        const currentSelectedId = selectedChat !== null && groupChats[selectedChat] ? groupChats[selectedChat].id : null;

        setGroupChats((prev) => {
          // If this is the initial load, set all groups
          if (isInitial) {
            return formattedGroups;
          }

          // Preserve unread counts from previous state, especially for groups that were marked as read
          console.log('📖 readGroupsRef contents:', Array.from(readGroupsRef.current));
          return formattedGroups.map(newGroup => {
            const groupIdStr = String(newGroup.id);
            const apiUnreadCount = newGroup.unread; // This is from the API response (line 533)

            // If this group has been opened/read in this session, check if new messages arrived
            if (readGroupsRef.current.has(groupIdStr)) {
              // If API returns a positive unread count, it means new messages arrived after being read
              // Remove from readGroupsRef to allow the badge to show
              if (apiUnreadCount > 0) {
                console.log(`📖 New messages arrived for group ${groupIdStr} (API returned ${apiUnreadCount}), removing from readGroupsRef to show badge`);
                readGroupsRef.current.delete(groupIdStr);
                // Use the API value to show the badge
                return {
                  ...newGroup,
                  unread: apiUnreadCount
                };
              } else {
                // No new messages, keep unread at 0
                console.log(`📖 Preserving unread=0 for group ${groupIdStr} (API returned ${apiUnreadCount}, was opened, no new messages)`);
                return {
                  ...newGroup,
                  unread: 0  // Force to 0, ignore API response - user has already seen this chat
                };
              }
            }

            // Otherwise use the unread count from API or previous state
            const oldGroup = prev.find(g => String(g.id) === groupIdStr);
            if (oldGroup) {
              // If old group had unread: 0, preserve it (might have been marked as read)
              // Otherwise use the new unread count from API
              const preservedUnread = oldGroup.unread === 0 ? 0 : (newGroup.unread || oldGroup.unread || 0);
              console.log(`📖 Group ${groupIdStr}: API=${apiUnreadCount}, Old=${oldGroup.unread}, Preserved=${preservedUnread}`);
              return {
                ...newGroup,
                unread: preservedUnread
              };
            }
            // New group, use API value
            console.log(`📖 New group ${groupIdStr}: using API unread count ${apiUnreadCount}`);
            return newGroup;
          });
        });

        // After state update, restore selectedChat index to the position of the same group id
        // Only restore if there was a previously selected chat (don't auto-select on initial load)
        if (currentSelectedId) {
          const newIndex = formattedGroups.findIndex((g) => String(g.id) === String(currentSelectedId));
          if (newIndex !== -1) {
            setSelectedChat(newIndex);
          } else {
            // selected group was deleted - clear selection
            setSelectedChat(null);
          }
        }
        // Removed auto-selection on initial load - user should manually select a chat
      }
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Fetch groups list on initial mount
  useEffect(() => {
    refreshGroupsList(true);
  }, []);

  // Poll for group updates every 5 seconds to detect new/deleted groups
  useEffect(() => {
    const interval = setInterval(() => {
      refreshGroupsList(false);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [selectedChat]);

  // Get current groupId from selected chat (memoized to prevent unnecessary re-runs)
  const currentGroupId = useMemo(() => {
    if (selectedChat === null || !groupChats || groupChats.length === 0) return null;
    return groupChats[selectedChat]?.id || null;
  }, [selectedChat, groupChats]);

  // Fetch messages and group info when selected chat changes
  useEffect(() => {
    if (selectedChat === null || !currentGroupId) return;

    const fetchMessagesAndInfo = async () => {
      try {
        const groupId = currentGroupId;
        const groupIdStr = String(groupId);

        console.log('📖 Opening chat, marking messages as read for group:', groupIdStr);

        // Always mark messages as read when chat is opened
        // Mark this group as read in our tracking FIRST (before any API calls)
        readGroupsRef.current.add(groupIdStr);
        console.log('📖 Added to readGroupsRef:', Array.from(readGroupsRef.current));

        // Update local unread count to 0 immediately (optimistic update)
        // This ensures the badge disappears immediately when chat is selected
        setGroupChats(prev => {
          const updated = prev.map(g => {
            if (String(g.id) === groupIdStr) {
              console.log(`📖 Setting unread to 0 for group ${groupIdStr} (was ${g.unread})`);
              return { ...g, unread: 0 };
            }
            return g;
          });
          return updated;
        });

        // Mark messages as read via API
        // Always call the API to ensure backend updates unread count
        // Don't check markedAsReadRef - always call to ensure backend is updated
        try {
          // Try to mark all messages as read
          console.log(`📖 Calling mark-as-read API for group ${groupId}...`);
          const markReadResponse = await axiosInstance.put(`/chat/groups/${groupId}/messages/read-all`);
          markedAsReadRef.current.add(groupIdStr);
          console.log('✅ Marked messages as read for group', groupId, markReadResponse.data);

          // Update unread count to 0 after successful mark-as-read
          setGroupChats(prev => prev.map(g =>
            String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
          ));

          // Force a refresh of unread counts after a short delay to ensure backend has updated
          setTimeout(async () => {
            try {
              const unreadResponse = await axiosInstance.get(`/chat/groups/${groupId}/unread-count`, {
                params: { _cacheBust: Date.now() },
                headers: { 'Cache-Control': 'no-cache' }
              });
              const unreadCount = unreadResponse?.data?.data?.unread_count ??
                                  unreadResponse?.data?.data?.unread_count ?? 0;
              console.log(`📊 Refreshed unread count after mark-as-read: ${unreadCount} for group ${groupId}`);
              if (unreadCount === 0) {
                // Backend confirmed unread is 0, update local state
                setGroupChats(prev => prev.map(g =>
                  String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
                ));
              }
            } catch (refreshError) {
              console.warn('⚠️ Failed to refresh unread count after mark-as-read:', refreshError);
            }
          }, 500); // Wait 500ms for backend to process
        } catch (e) {
          console.error('❌ Error marking messages as read:', e);
          console.error('❌ Error response:', e?.response?.data);
          console.error('❌ Error status:', e?.response?.status);

          // Try fallback endpoint if read-all doesn't work
          if (e?.response?.status === 400 || e?.response?.status === 404) {
            try {
              console.log('📖 Trying fallback mark-read endpoint...');
              const fallbackResponse = await axiosInstance.put(`/chat/groups/${groupId}/messages/mark-read`);
              markedAsReadRef.current.add(groupIdStr);
              console.log('✅ Marked messages as read (fallback) for group', groupId, fallbackResponse.data);

              setGroupChats(prev => prev.map(g =>
                String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
              ));
            } catch (fallbackError) {
              console.warn('⚠️ Fallback mark-read also failed:', fallbackError);
              // Mark as processed even if both failed
              markedAsReadRef.current.add(groupIdStr);
              // Still update local state to 0 since user is viewing the chat
              setGroupChats(prev => prev.map(g =>
                String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
              ));
            }
          } else {
            // For other errors, log but still mark as processed
            console.warn('⚠️ Failed to mark messages as read:', e);
            markedAsReadRef.current.add(groupIdStr);
            // Still update local state to 0 since user is viewing the chat
            setGroupChats(prev => prev.map(g =>
              String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
            ));
          }
        }

        // Fetch messages
        const messagesResponse = await axiosInstance.get(`/chat/groups/${groupId}/messages`);
        if (messagesResponse.data.success) {
          const formattedMessages = messagesResponse.data.data.map((msg) => formatMessage(msg));
          setMessages(formattedMessages);
          // Initialize previous message IDs ref for polling detection
          previousMessageIdsRef.current = new Set(formattedMessages.map(m => m.id));
        }

        // Fetch group info
        const infoResponse = await axiosInstance.get(`/chat/groups/${groupId}/info`);
        if (infoResponse.data.success) {
          setGroupInfo(infoResponse.data.data);
        }
      } catch (error) {
        console.error('❌ Error fetching messages/info:', error);
      }
    };

    fetchMessagesAndInfo();

    // Poll for new messages every 3 seconds while chat is open
    const messagesInterval = setInterval(() => {
      if (selectedChat === null || !currentGroupId) return;

      const fetchNewMessages = async () => {
        try {
          const groupId = currentGroupId;
          const groupIdStr = String(groupId);
          const messagesResponse = await axiosInstance.get(`/chat/groups/${groupId}/messages`);
          if (messagesResponse.data.success) {
            const formattedMessages = messagesResponse.data.data.map((msg) => formatMessage(msg));

            // Check if there are new messages BEFORE updating state
            const currentMessageIds = new Set(formattedMessages.map(m => m.id));
            const prevIds = previousMessageIdsRef.current;
            const hasNewMessages = formattedMessages.length !== prevIds.size ||
                                  formattedMessages.some(m => !prevIds.has(m.id));

            // Update previous message IDs
            previousMessageIdsRef.current = currentMessageIds;

            // Update messages state
            setMessages(prev => {
              if (prev.length !== formattedMessages.length) {
                // Message count changed, update with new messages
                console.log('📨 Messages updated:', formattedMessages.length, 'prev:', prev.length);
                return formattedMessages;
              }
              // Check if any message IDs are new
              const prevIds = new Set(prev.map(m => m.id));
              const newMessagesExist = formattedMessages.some(m => !prevIds.has(m.id));
              if (newMessagesExist) {
                console.log('📨 New messages detected');
                return formattedMessages;
              }
              return prev;
            });

            // If new messages arrived while chat is open, mark them as read
            if (hasNewMessages) {
              console.log('📖 New messages arrived in open chat, marking as read for group:', groupIdStr);
              try {
                // Mark all messages as read (including the new ones)
                await axiosInstance.put(`/chat/groups/${groupId}/messages/read-all`);
                console.log('✅ Marked new messages as read for group', groupId);

                // Update unread count to 0
                setGroupChats(prev => prev.map(g =>
                  String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
                ));
              } catch (e) {
                // Silently ignore 400/404 errors (endpoint might not be supported)
                if (e?.response?.status !== 400 && e?.response?.status !== 404) {
                  console.warn('⚠️ Failed to mark new messages as read:', e);
                }
                // Still update local state to 0 since user is viewing the chat
                setGroupChats(prev => prev.map(g =>
                  String(g.id) === groupIdStr ? { ...g, unread: 0 } : g
                ));
              }
            }
          }
        } catch (error) {
          console.error('❌ Error fetching new messages:', error);
        }
      };
      fetchNewMessages();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(messagesInterval);
  }, [selectedChat, currentGroupId, isMobile, showMainChat]); // Use currentGroupId instead of groupChats

  // Reset marked-as-read tracking when chat is deselected
  // This allows marking as read again when reopening the same chat
  useEffect(() => {
    if (selectedChat === null) {
      // When no chat is selected, clear tracking so chats can be marked as read again when reopened
      // Note: We don't clear readGroupsRef here - we want to keep unread at 0 for groups that were opened
      markedAsReadRef.current.clear();
    }
  }, [selectedChat]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMainChat(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChatSelect = (index) => {
    setSelectedChat(index);
    if (isMobile) {
      setShowMainChat(true);
    }
  };

  const handleBackToChats = () => {
    console.log('🔵 handleBackToChats called', { isMobile, showMainChat, showRightSidebarMobile, selectedChat });
    // Clear selected chat to remove highlight
    setSelectedChat(null);
    setShowMainChat(false);
    // Close right sidebar if open
    if (showRightSidebarMobile) {
      setShowRightSidebarMobile(false);
    }
    // Clear any active sections
    setActiveInfoSection(null);
  };

  const handleGroupNameClick = () => {
    // Open the first section (contents) to show group info in right sidebar
    if (!activeInfoSection) {
      setActiveInfoSection('contents');
    }
    // On mobile, show the right sidebar and hide main chat
    if (isMobile) {
      setShowRightSidebarMobile(true);
      setShowMainChat(false);
    } else {
      // On desktop, ensure main chat stays visible
      setShowMainChat(true);
    }
  };

  const handleMessageEdited = (messageId, newText) => {
    // Update the last message in the chats panel if this is the last message
    if (selectedChat !== null && groupChats[selectedChat]) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.id === messageId) {
        setGroupChats(prev => prev.map((chat, index) => {
          if (index === selectedChat) {
            return { ...chat, subject: newText };
          }
          return chat;
        }));
      }
    }
  };

  const handleSendMessage = async ({ text, file, mediaCategory }) => {
    if (selectedChat === null) return false;

    const groupId = groupChats[selectedChat]?.id;
    if (!groupId) return false;

    const trimmedText = text?.trim() || '';
    if (!trimmedText && !file) {
      return false;
    }

    const tempId = `temp-${Date.now()}`;
    let localMediaUrl = null;
    const normalizedType = file ? deriveMediaCategory(file, mediaCategory) : null;

    const optimisticMessage = {
      id: tempId,
      sender: user?.name || "You",
      initials: user?.name?.charAt(0)?.toUpperCase() || 'ME',
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      text: trimmedText,
      date: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      created_at: new Date().toISOString(),
      senderPhoto: user?.photo || null,
      senderEmail: user?.email || null,
      media: []
    };

    if (file) {
      localMediaUrl = URL.createObjectURL(file);
      const originalName = file.name || 'attachment';
      optimisticMessage.media = [{
        id: `${tempId}-media`,
        media_url: localMediaUrl,
        media_type: normalizedType || 'document',
        isLocal: true,
        file_name: originalName
      }];
    }

    setMessages((prev) => [...prev, optimisticMessage]);

    const previewLabel = trimmedText || (file ? 'Media attachment' : '');
    setGroupChats(prev => prev.map((chat, index) => {
      if (index === selectedChat) {
        return { ...chat, subject: previewLabel || chat.subject };
      }
      return chat;
    }));

    const formData = new FormData();
    if (trimmedText) {
      formData.append('message', trimmedText);
    }
    if (file) {
      formData.append('media', file);
      if (normalizedType) {
        formData.append('media_type', normalizedType);
      }
      if (file.type) {
        formData.append('file_mime', file.type);
      }
      if (file.name) {
        formData.append('file_name', file.name);
      }
    }

    setIsSendingMessage(true);
    try {
      const res = await axiosInstance.post(`/chat/groups/${groupId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res?.data?.success && res.data.data) {
        const formattedMessage = formatMessage(res.data.data);
        setMessages((prev) => prev.map((msg) => (msg.id === tempId ? formattedMessage : msg)));
        return true;
      }
      throw new Error('Failed to send message');
    } catch (err) {
      console.error('❌ REST fallback failed to send message:', err);
      smartToast.error(err?.response?.data?.message || 'Failed to send message');
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      return false;
    } finally {
      if (localMediaUrl) {
        URL.revokeObjectURL(localMediaUrl);
      }
      setIsSendingMessage(false);
    }
  };

  const selectedChatData = selectedChat !== null ? groupChats[selectedChat] : null;
  const chatTitle = selectedChatData ? selectedChatData.group_name : 'Group Chat';

  const rawContentResources = useMemo(() => groupInfo?.content?.resources || [], [groupInfo]);
  const contentResources = useMemo(() => categorizeResources(rawContentResources), [rawContentResources]);

  const mediaArray = useMemo(() => {
    if (groupInfo?.group?.group_media) return groupInfo.group.group_media;
    return groupInfo?.group_media || [];
  }, [groupInfo]);

  const groupMediaItems = useMemo(() => categorizeMediaItems(mediaArray), [mediaArray]);

  const mediaSummary = useMemo(() => {
    const summary = {
      images: groupMediaItems?.images || [],
      videos: groupMediaItems?.videos || [],
      audio: groupMediaItems?.audio || [],
      files: groupMediaItems?.files || [],
      links: extractLinksFromMessages(messages)
    };
    console.log('Media summary:', summary);
    return summary;
  }, [messages, groupMediaItems]);


  const groupMembers = useMemo(() => groupInfo?.members || [], [groupInfo]);

  const calendarEvents = [
    {
      month: 'Sep',
      day: '25',
      online: 'Online',
      type: 'Group Meeting',
      startTime: '8:25',
      startPeriod: 'AM',
      endTime: '10:20',
      endPeriod: 'AM',
      avatars: ['M', 'A']
    },
    {
      month: 'Sep',
      day: '26',
      online: 'Online',
      type: 'Group Meeting',
      startTime: '8:25',
      startPeriod: 'AM',
      endTime: '10:20',
      endPeriod: 'AM',
      avatars: ['M', 'A']
    }
  ];

  const currentUser = {
    name: user?.name || 'User',
    initials: user?.name?.charAt(0)?.toUpperCase() || 'U',
    status: 'Online'
  };

  const handleToggleInfoSection = (section) => {
    // Toggle the section
    const newSection = activeInfoSection === section ? null : section;
    setActiveInfoSection(newSection);

    // On mobile, navigate to main chat and show the section
    if (isMobile && newSection) {
      setShowRightSidebarMobile(false);
      setShowMainChat(true);
    }
  };

  if (loading) {
    return (
      <div
        className="home-container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
        onChatSelect={handleChatSelect}
        isMobile={isMobile}
        showMainChat={showMainChat}
      />

      <MainChat
        messages={selectedChatData ? messages : []}
        chatTitle={selectedChat !== null && groupChats[selectedChat] ? groupChats[selectedChat]?.name : 'Select a chat'}
        isMobile={isMobile}
        showMainChat={showMainChat}
        onBackToChats={handleBackToChats}
        onSendMessage={handleSendMessage}
        activeSection={activeInfoSection}
        onCloseSection={() => setActiveInfoSection(null)}
        contentResources={contentResources}
        groupMediaItems={groupMediaItems}
        groupMembers={groupMembers}
        currentUserEmail={user?.email}
        groupId={selectedChatData?.id || null}
        onMessageEdited={handleMessageEdited}
        isSendingMessage={isSendingMessage}
        onGroupNameClick={handleGroupNameClick}
      />

      <RightSidebar
        groupInfo={groupInfo}
        calendarEvents={calendarEvents}
        user={currentUser}
        isMobile={isMobile}
        showMainChat={showMainChat}
        activeSection={activeInfoSection}
        onSelectSection={handleToggleInfoSection}
        contentSummary={contentResources}
        mediaSummary={mediaSummary}
        memberCount={groupMembers.length}
        showMobile={showRightSidebarMobile}
        selectedChat={selectedChat}
        onCloseMobile={() => {
          setShowRightSidebarMobile(false);
          // Restore main chat when closing sidebar on mobile
          if (isMobile) {
            setShowMainChat(true);
          }
        }}
        onOpenSidebar={() => {
          console.log('🔵 onOpenSidebar called from GroupChat - opening sidebar menu');
          // Dispatch custom event to trigger AppLayout sidebar
          window.dispatchEvent(new CustomEvent('openMobileSidebar'));
          // Don't close right sidebar - let the sidebar menu open on top
        }}
        onOpenNotifications={() => {
          console.log('🔔 onOpenNotifications called from GroupChat - opening notifications');
          // Dispatch custom event to trigger AppLayout notification panel
          window.dispatchEvent(new CustomEvent('openNotificationPanel'));
          // Don't close right sidebar - let the notification panel open on top
        }}
        unreadNotificationCount={0}
      />
    </div>
  );
}