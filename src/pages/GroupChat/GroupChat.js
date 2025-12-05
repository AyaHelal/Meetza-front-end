import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
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

export default function GroupChat({ activeNav, setActiveNav, onOpenSidebar }) {
  const { user } = useContext(AuthContext);
  const [selectedChat, setSelectedChat] = useState(null);
  // track the origin of the last selection so we only fetch/mark-read when the user clicked the panel
  const lastSelectFromPanelRef = React.useRef(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMainChat, setShowMainChat] = useState(false);
  // sockets disabled — using HTTP polling for live updates
  const [groupChats, setGroupChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [activeInfoSection, setActiveInfoSection] = useState(null);
  const [showRightSidebarMobile, setShowRightSidebarMobile] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Add class to body when GroupChat is mounted
  useEffect(() => {
    document.documentElement.classList.add('group-chat-active');
    document.body.classList.add('group-chat-active');

    return () => {
      document.documentElement.classList.remove('group-chat-active');
      document.body.classList.remove('group-chat-active');
    };
  }, []);
  const openedGroupsRef = React.useRef(new Set());
  const fetchingRef = React.useRef(false);
  const lastFetchedGroupIdRef = React.useRef(null);
  // Track recently viewed chats (groupId -> timestamp) to preserve unread = 0
  const recentlyViewedRef = React.useRef(new Map());

  // Format message with media support
  const formatMessage = useCallback((msg) => ({
    id: msg.id,
    sender: msg.sender_name,
    initials: msg.sender_name?.charAt(0)?.toUpperCase() || 'U',
    time: new Date(msg.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    message: msg.message,
    text: msg.message,
    date: new Date(msg.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
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

  // Define group event handler outside socket effect so it can be referenced in cleanup
  /* eslint-disable-next-line no-unused-vars */
  const groupEventNames = ['groupCreated', 'group_created', 'newGroup', 'new_group', 'group:add', 'group', 'groupUpdated'];

  /* eslint-disable-next-line no-unused-vars */
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

        setGroupChats((prev) => {
          const formatted = groupsWithContent.map((g) => {
            const prevGroup = prev.find(p => String(p.id) === String(g.id));
            let subject = g.last_message || 'No messages yet';

            // Preserve media preview if it exists and API doesn't have last_message
            if (prevGroup && prevGroup.subject &&
              (prevGroup.subject.startsWith('📷') || prevGroup.subject.startsWith('🎥') ||
                prevGroup.subject.startsWith('🎵') || prevGroup.subject.startsWith('🔗') ||
                prevGroup.subject.startsWith('📄')) &&
              !g.last_message) {
              subject = prevGroup.subject;
            }

            return {
              id: g.id,
              name: g.group_name,
              subject: subject,
              avatar: g.group_name?.charAt(0)?.toUpperCase() || 'G',
              avatarImage: g.group_photo || null,
              date: g.last_message_at
                ? new Date(g.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              unread: g.unread ?? g.unread_count ?? g.unreadCount ?? 0,
              group_name: g.group_name,
              group_content_id: g.group_content_id,
              contentName: g.contentName
            };
          });
          return formatted;
        });
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

      // Preserve media preview from previous state if API doesn't have last_message
      const prevGroup = groupChats.find(p => String(p.id) === String(group.id));
      let subject = group.last_message || 'No messages yet';
      if (prevGroup && prevGroup.subject &&
        (prevGroup.subject.startsWith('📷') || prevGroup.subject.startsWith('🎥') ||
          prevGroup.subject.startsWith('🎵') || prevGroup.subject.startsWith('🔗') ||
          prevGroup.subject.startsWith('📄')) &&
        !group.last_message) {
        subject = prevGroup.subject;
      }

      const formattedGroup = {
        id: group.id,
        name: group.group_name || group.name,
        subject: subject,
        avatar: (group.group_name || group.name || 'G').charAt(0).toUpperCase(),
        avatarImage: group.group_photo || null,
        date: group.last_message_at ? new Date(group.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        unread: group.unread ?? group.unread_count ?? group.unreadCount ?? 0,
        group_name: group.group_name || group.name,
        group_content_id: group.group_content_id,
        contentName: contentName
      };

      // Check if this group was recently viewed - if yes, force unread to 0
      const now = Date.now();
      const RECENTLY_VIEWED_TIMEOUT = 15 * 1000;
      const wasRecentlyViewed = recentlyViewedRef.current.has(String(formattedGroup.id)) &&
        (now - recentlyViewedRef.current.get(String(formattedGroup.id))) < RECENTLY_VIEWED_TIMEOUT;

      if (wasRecentlyViewed) {
        formattedGroup.unread = 0;
      }

      setGroupChats((prev) => {
        const exists = prev.some((g) => String(g.id) === String(formattedGroup.id));
        // Keep unread=0 if currently selected OR recently viewed
        const isCurrentlySelected = selectedChat !== null &&
          prev[selectedChat] &&
          String(prev[selectedChat].id) === String(formattedGroup.id);

        const now = Date.now();
        const RECENTLY_VIEWED_TIMEOUT = 15 * 1000;
        const wasRecentlyViewed = recentlyViewedRef.current.has(String(formattedGroup.id)) &&
          (now - recentlyViewedRef.current.get(String(formattedGroup.id))) < RECENTLY_VIEWED_TIMEOUT;

        if (isCurrentlySelected || wasRecentlyViewed) {
          formattedGroup.unread = 0;
        }

        if (exists) {
          return prev.map((g) => (String(g.id) === String(formattedGroup.id) ? formattedGroup : g));
        }
        return [formattedGroup, ...prev];
      });
    } catch (err) {
      console.error('❌ Error handling group event:', err);
    }
  };

  // socket initialization removed — this client uses polling instead

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

        // Format groups to match ChatItem component structure and include unread counts
        // We'll attempt to fetch per-group unread counts from the server for each group.
        // Fetch last message only on initial load to avoid flickering
        const formattedGroups = await Promise.all(groupsWithContent.map(async (group) => {
          // Get previous group to preserve media previews
          const prevGroup = groupChats.find(p => String(p.id) === String(group.id));
          let lastMessagePreview = group.last_message || 'No messages yet';

          // Only fetch last message on initial load or if we don't have a media preview
          const hasMediaPreview = prevGroup?.subject &&
            (prevGroup.subject.startsWith('📷') || prevGroup.subject.startsWith('🎥') ||
              prevGroup.subject.startsWith('🎵') || prevGroup.subject.startsWith('🔗') ||
              prevGroup.subject.startsWith('📄'));

          // If we have a media preview and API has last_message, use API's value (it might be newer)
          // If API doesn't have last_message, keep the media preview
          if (hasMediaPreview && !group.last_message) {
            lastMessagePreview = prevGroup.subject;
          } else if (isInitial || (!hasMediaPreview && !group.last_message)) {
            // Only fetch on initial load or when we need to get media preview
            try {
              const lastMsgResponse = await axiosInstance.get(`/chat/groups/${group.id}/messages?limit=1`);
              if (lastMsgResponse.data.success && lastMsgResponse.data.data && lastMsgResponse.data.data.length > 0) {
                const lastMsg = lastMsgResponse.data.data[0];
                const formattedMsg = formatMessage(lastMsg);

                // If message has text, use it
                if (formattedMsg.message || formattedMsg.text) {
                  lastMessagePreview = formattedMsg.message || formattedMsg.text;
                }
                // If no text but has media, show media preview
                else if (formattedMsg.media && formattedMsg.media.length > 0) {
                  const firstMedia = formattedMsg.media[0];
                  if (firstMedia.media_type === 'image' || firstMedia.media_type?.startsWith('image')) {
                    lastMessagePreview = '📷 Photo';
                  } else if (firstMedia.media_type === 'video' || firstMedia.media_type?.startsWith('video')) {
                    lastMessagePreview = '🎥 Video';
                  } else if (firstMedia.media_type === 'audio' || firstMedia.media_type?.startsWith('audio')) {
                    lastMessagePreview = '🎵 Audio';
                  } else if (firstMedia.media_type === 'link') {
                    try {
                      const url = new URL(firstMedia.media_url || firstMedia.file_url);
                      lastMessagePreview = `🔗 ${url.hostname.replace('www.', '')}`;
                    } catch {
                      lastMessagePreview = '🔗 Link';
                    }
                  } else {
                    const fileName = firstMedia.file_name || 'Document';
                    lastMessagePreview = `📄 ${fileName}`;
                  }
                }
              }
            } catch (err) {
              // Silently fail - use default last_message from group or preserve media preview
              if (hasMediaPreview) {
                lastMessagePreview = prevGroup.subject;
              }
              console.debug('Could not fetch last message for group', group.id, err);
            }
          }

          return {
            // return a properly formed object for each group
            id: group.id,
            name: group.group_name,
            subject: lastMessagePreview,
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
            // default value until we fetch per-group unread count
            unread: (group.unread ?? group.unread_count ?? group.unreadCount) ?? 0,
            group_name: group.group_name,
            group_content_id: group.group_content_id,
            contentName: group.contentName
          };
        }));

        // If the server did not return unread in the initial payload, fetch unread-count per group.
        // We'll try to fetch counts for groups which have a falsy unread value (0 or undefined) ONLY when the server didn't provide a value.
        const needsFetch = formattedGroups.filter(g => g.unread === 0 && !(groupsWithContent.find(w => String(w.id) === String(g.id))?.hasOwnProperty('unread')));
        if (needsFetch.length > 0) {
          console.debug('GroupChat.refreshGroupsList: fetching unread-count for groups', needsFetch.map(g => g.id));
          try {
            const unreadResults = await Promise.allSettled(needsFetch.map(async (g) => {
              try {
                const res = await axiosInstance.get(`/chat/groups/${g.id}/unread-count`);
                const payload = res?.data;
                let c = 0;
                if (payload) {
                  // Handle different response formats
                  if (typeof payload.data === 'number') {
                    c = payload.data;
                  } else if (payload.data && typeof payload.data.unread_count === 'number') {
                    c = payload.data.unread_count;
                  } else if (payload.data && typeof payload.data.count === 'number') {
                    c = payload.data.count;
                  } else if (payload.data && typeof payload.data.unread === 'number') {
                    c = payload.data.unread;
                  } else if (typeof payload.count === 'number') {
                    c = payload.count;
                  } else if (typeof payload.unread_count === 'number') {
                    c = payload.unread_count;
                  } else if (typeof payload.unread === 'number') {
                    c = payload.unread;
                  } else {
                    // Try to parse as number
                    c = Number(payload.data) || Number(payload?.data?.unread) || 0;
                  }
                }
                console.debug(`Unread count for group ${g.id}:`, { payload, parsedCount: c });
                return { id: g.id, count: c };
              } catch (e) {
                return { id: g.id, count: 0 };
              }
            }));

            const countsById = {};
            unreadResults.forEach(r => { if (r.status === 'fulfilled') countsById[String(r.value.id)] = r.value.count; });

            // merge back counts
            const now = Date.now();
            const RECENTLY_VIEWED_TIMEOUT = 15 * 1000;

            // Clean up old entries from recentlyViewedRef
            for (const [groupId, timestamp] of recentlyViewedRef.current.entries()) {
              if (now - timestamp > RECENTLY_VIEWED_TIMEOUT) {
                recentlyViewedRef.current.delete(groupId);
              }
            }
            for (let i = 0; i < formattedGroups.length; i++) {
              const id = String(formattedGroups[i].id);
              if (countsById.hasOwnProperty(id)) {
                const wasRecentlyViewed = recentlyViewedRef.current.has(id) &&
                  (now - recentlyViewedRef.current.get(id)) < RECENTLY_VIEWED_TIMEOUT;

                const isCurrentlySelected = selectedChat !== null &&
                  groupChats[selectedChat] &&
                  String(groupChats[selectedChat].id) === id;

                formattedGroups[i].unread = (isCurrentlySelected || wasRecentlyViewed) ? 0 : countsById[id];
              }
            }
          } catch (e) {
            // non-fatal — leave unread 0 where unknown
            console.warn('Error fetching per-group unread counts', e);
          }
        }

        // Preserve the currently selected chat by ID when updating the list
        const currentSelectedId = selectedChat !== null && groupChats[selectedChat] ? groupChats[selectedChat].id : null;

        // Preserve unread = 0 for currently selected chat OR if current local value is 0 and was recently viewed
        // This ensures that if we set unread = 0 locally when new message arrived while chat was open,
        // it stays 0 even after refreshGroupsList runs
        const now = Date.now();
        const RECENTLY_VIEWED_TIMEOUT = 2 * 60 * 1000; // 2 minutes
        formattedGroups.forEach(g => {
          const groupIdStr = String(g.id);
          const isCurrentlySelected = currentSelectedId && String(currentSelectedId) === groupIdStr;
          const wasRecentlyViewed = recentlyViewedRef.current.has(groupIdStr) &&
            (now - recentlyViewedRef.current.get(groupIdStr)) < RECENTLY_VIEWED_TIMEOUT;

          // Get current local unread value from groupChats
          const currentLocalUnread = groupChats.find(chat => String(chat.id) === groupIdStr)?.unread ?? g.unread;

          // If currently selected, always set to 0
          // If was recently viewed AND current local value is 0, keep it at 0 (don't overwrite with server value)
          if (isCurrentlySelected) {
            g.unread = 0;
          } else if (wasRecentlyViewed && currentLocalUnread === 0) {
            // Keep unread = 0 if it was recently viewed and we set it to 0 locally
            g.unread = 0;
          }
          // Otherwise, use the value from server (which may have new unread messages)
        });

        setGroupChats((prev) => {
          // If this is the initial load, set all groups
          if (isInitial) {
            return formattedGroups;
          }

          // Merge with previous state to preserve locally set subjects (like media previews)
          return formattedGroups.map(newGroup => {
            const prevGroup = prev.find(p => String(p.id) === String(newGroup.id));

            // If previous subject is a media preview (starts with emoji)
            const prevIsMediaPreview = prevGroup?.subject &&
              (prevGroup.subject.startsWith('📷') || prevGroup.subject.startsWith('🎥') ||
                prevGroup.subject.startsWith('🎵') || prevGroup.subject.startsWith('🔗') ||
                prevGroup.subject.startsWith('📄'));

            // If new subject is also a media preview, use it (it's from fresh fetch)
            const newIsMediaPreview = newGroup.subject &&
              (newGroup.subject.startsWith('📷') || newGroup.subject.startsWith('🎥') ||
                newGroup.subject.startsWith('🎵') || newGroup.subject.startsWith('🔗') ||
                newGroup.subject.startsWith('📄'));

            // If new subject has text (not empty, not "No messages yet"), always use it
            if (newGroup.subject && newGroup.subject !== 'No messages yet' && !newIsMediaPreview) {
              return newGroup;
            }

            // If new subject is a media preview, use it (fresh fetch)
            if (newIsMediaPreview) {
              return newGroup;
            }

            // If new subject is "No messages yet" but we have a media preview, keep the preview
            if (prevIsMediaPreview && (!newGroup.subject || newGroup.subject === 'No messages yet')) {
              return { ...newGroup, subject: prevGroup.subject };
            }

            // Fallback: use new subject if it exists, otherwise keep previous, otherwise "No messages yet"
            return { ...newGroup, subject: newGroup.subject || prevGroup?.subject || 'No messages yet' };
          });
        });

        // After state update, restore selectedChat index to the position of the same group id
        // Don't auto-select any chat on initial load - let user choose
        if (currentSelectedId) {
          const newIndex = formattedGroups.findIndex((g) => String(g.id) === String(currentSelectedId));
          if (newIndex !== -1) {
            setSelectedChat(newIndex);
          } else {
            // selected group was deleted - don't auto-select another one
            setSelectedChat(null);
          }
        }
        // Removed: else if (isInitial && formattedGroups.length > 0) { setSelectedChat(0); }
        // This ensures no chat is selected on initial load
      }
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Fetch groups list on initial mount
  // We intentionally omit refreshGroupsList from deps to run this only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    refreshGroupsList(true);
  }, []);


  // Poll for group updates every 5 seconds to detect new/deleted groups
  // Poll for updates; omit refreshGroupsList from deps on purpose
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = setInterval(() => {
      refreshGroupsList(false);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [selectedChat]);

  // Poll for new messages when a chat is open and mark them as read
  useEffect(() => {
    if (selectedChat === null || groupChats.length === 0) return;

    // Only poll when chat is visible (on mobile, check showMainChat; on desktop, always visible)
    const isChatVisible = !isMobile || showMainChat;
    if (!isChatVisible) return;

    const groupId = groupChats[selectedChat]?.id;
    if (!groupId) return;

    // Track last time we marked messages as read and last message IDs
    let lastMarkedAsReadTime = 0;
    let lastKnownMessageIds = new Set();
    let chatOpenedTime = Date.now(); // Track when chat was opened
    let initialMessagesFetched = false;

    // Mark messages as read function
    const markAsRead = async () => {
      try {
        await axiosInstance.put(`/chat/groups/${groupId}/messages/read-all`);
        // Update local unread count to 0
        setGroupChats(prev => prev.map(g =>
          String(g.id) === String(groupId) ? { ...g, unread: 0 } : g
        ));
        // Mark as recently viewed
        recentlyViewedRef.current.set(String(groupId), Date.now());
        lastMarkedAsReadTime = Date.now();
      } catch (err) {
        // Silently ignore 400/404 errors (endpoint might not be supported)
        if (err?.response?.status !== 400 && err?.response?.status !== 404) {
          console.warn('Failed to mark messages as read:', err);
        }
        // Still update local state to 0 and mark as recently viewed
        setGroupChats(prev => prev.map(g =>
          String(g.id) === String(groupId) ? { ...g, unread: 0 } : g
        ));
        recentlyViewedRef.current.set(String(groupId), Date.now());
        lastMarkedAsReadTime = Date.now();
      }
    };

    // Poll for new messages every 5 seconds when chat is open and visible
    const messagePollInterval = setInterval(async () => {
      try {
        // Fetch latest messages
        const messagesResponse = await axiosInstance.get(`/chat/groups/${groupId}/messages`);
        if (messagesResponse.data.success) {
          const newMessages = messagesResponse.data.data.map((msg) => ({
            ...formatMessage(msg),
            created_at: msg.created_at // Keep original timestamp for comparison
          }));

          // Check if there are new messages (messages we haven't seen before)
          const currentMessageIds = new Set(newMessages.map(m => m.id));
          const hasNewMessages = Array.from(currentMessageIds).some(id => !lastKnownMessageIds.has(id));

          if (!initialMessagesFetched) {
            // First time fetching messages - check if there are unread messages
            initialMessagesFetched = true;
            const currentChat = groupChats && groupChats[selectedChat];
            const hasUnread = (currentChat?.unread || 0) > 0;

            if (hasUnread) {
              // There are unread messages - wait 3 seconds then mark as read (give user time to see them)
              setTimeout(() => {
                markAsRead();
              }, 3000);
            } else {
              // No unread messages - mark as read immediately
              markAsRead();
            }
          } else if (hasNewMessages) {
            // There are new messages that arrived while chat is open
            const newMessageObjects = newMessages.filter(m => !lastKnownMessageIds.has(m.id));
            const newestMessageTime = Math.max(...newMessageObjects.map(m => new Date(m.created_at).getTime()));
            const messagesArrivedAfterOpen = newestMessageTime > chatOpenedTime;

            if (messagesArrivedAfterOpen) {
              // Messages arrived while chat is open - user is viewing, so mark unread = 0 immediately locally
              // This ensures unread count stays 0 even if refreshGroupsList runs before server update
              setGroupChats(prev => prev.map(g =>
                String(g.id) === String(groupId) ? { ...g, unread: 0 } : g
              ));

              // Mark as recently viewed to preserve unread = 0 even after switching chats
              recentlyViewedRef.current.set(String(groupId), Date.now());

              // Then mark as read on server (can be async, doesn't need to wait)
              // Mark immediately since user is viewing the chat
              markAsRead();
            }
            // If messages arrived before opening, don't mark as read (let unread count show)
          } else {
            // No new messages - mark as read periodically (every 30 seconds) to ensure they stay marked
            const timeSinceLastMark = Date.now() - lastMarkedAsReadTime;
            if (timeSinceLastMark > 30000 && lastMarkedAsReadTime > 0) { // 30 seconds and we've marked before
              markAsRead();
            }
          }

          lastKnownMessageIds = currentMessageIds;
          setMessages(newMessages);

          // Update chat subject with last message preview (including media)
          if (newMessages.length > 0) {
            const lastMsg = newMessages[newMessages.length - 1];
            let previewText = lastMsg.message || lastMsg.text || '';

            // If no text but has media, show media preview
            if (!previewText && lastMsg.media && lastMsg.media.length > 0) {
              const firstMedia = lastMsg.media[0];
              if (firstMedia.media_type === 'image' || firstMedia.media_type?.startsWith('image')) {
                previewText = '📷 Photo';
              } else if (firstMedia.media_type === 'video' || firstMedia.media_type?.startsWith('video')) {
                previewText = '🎥 Video';
              } else if (firstMedia.media_type === 'audio' || firstMedia.media_type?.startsWith('audio')) {
                previewText = '🎵 Audio';
              } else if (firstMedia.media_type === 'link') {
                try {
                  const url = new URL(firstMedia.media_url || firstMedia.file_url);
                  previewText = `🔗 ${url.hostname.replace('www.', '')}`;
                } catch {
                  previewText = '🔗 Link';
                }
              } else {
                const fileName = firstMedia.file_name || 'Document';
                previewText = `📄 ${fileName}`;
              }
            }

            setGroupChats(prev => prev.map(g =>
              String(g.id) === String(groupId)
                ? { ...g, unread: 0, subject: previewText || g.subject }
                : g
            ));
          } else {
            setGroupChats(prev => prev.map(g =>
              String(g.id) === String(groupId) ? { ...g, unread: 0 } : g
            ));
          }
        }
      } catch (error) {
        // Only log non-400/404 errors
        if (error?.response?.status !== 400 && error?.response?.status !== 404) {
          console.warn('Error polling messages:', error);
        }
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup: just clear the interval, don't try to mark as read (causes errors)
    return () => {
      clearInterval(messagePollInterval);
    };
  }, [selectedChat, groupChats, isMobile, showMainChat, formatMessage]);

  // Get current groupId from selected chat (memoized to prevent unnecessary re-runs)
  const currentGroupId = useMemo(() => {
    if (selectedChat === null || !groupChats || groupChats.length === 0) return null;
    return groupChats[selectedChat]?.id || null;
  }, [selectedChat, groupChats]);

  // Fetch messages and group info when selected chat changes
  useEffect(() => {
    if (selectedChat === null || !currentGroupId) {
      // Reset fetching state when no chat is selected
      if (selectedChat === null) {
        lastFetchedGroupIdRef.current = null;
      }
      return;
    }

    const groupId = currentGroupId;

    // Prevent concurrent fetches and unnecessary re-fetches
    if (fetchingRef.current) return;
    if (lastFetchedGroupIdRef.current === groupId) return;

    fetchingRef.current = true;
    lastFetchedGroupIdRef.current = groupId;

    const fetchMessagesAndInfo = async () => {
      try {

        // Always mark messages as read when chat is selected and visible
        // This ensures that when user views a chat, all messages are marked as read on the server
        const isChatVisible = !isMobile || showMainChat;
        if (isChatVisible) {
          // Always try to mark as read on the server when chat is opened
          try {
            await axiosInstance.put(`/chat/groups/${groupId}/messages/read-all`);
            // Update local state to 0
            setGroupChats(prev => prev.map(g =>
              String(g.id) === String(groupId) ? { ...g, unread: 0 } : g
            ));
            // Mark as recently viewed
            recentlyViewedRef.current.set(String(groupId), Date.now());
          } catch (e) {
            // Silently ignore 400/404 errors (endpoint might not be supported)
            if (e?.response?.status !== 400 && e?.response?.status !== 404) {
              console.warn('Failed to mark as read:', e);
            }
            // Still update local state to 0 and mark as recently viewed since user is viewing the chat
            setGroupChats(prev => prev.map(g =>
              String(g.id) === String(groupId) ? { ...g, unread: 0 } : g
            ));
            recentlyViewedRef.current.set(String(groupId), Date.now());
          }
        }

        // Note: marking messages read on server is handled only when selection comes from the ChatsPanel

        // Fetch messages
        try {
          const messagesResponse = await axiosInstance.get(`/chat/groups/${groupId}/messages`);
          if (messagesResponse.data.success) {
            const formattedMessages = messagesResponse.data.data.map((msg) => formatMessage(msg));
            setMessages(formattedMessages);

            // Update chat subject with last message preview (including media)
            if (formattedMessages.length > 0) {
              const lastMsg = formattedMessages[formattedMessages.length - 1];
              let previewText = lastMsg.message || lastMsg.text || '';

              // If no text but has media, show media preview
              if (!previewText && lastMsg.media && lastMsg.media.length > 0) {
                const firstMedia = lastMsg.media[0];
                if (firstMedia.media_type === 'image' || firstMedia.media_type?.startsWith('image')) {
                  previewText = '📷 Photo';
                } else if (firstMedia.media_type === 'video' || firstMedia.media_type?.startsWith('video')) {
                  previewText = '🎥 Video';
                } else if (firstMedia.media_type === 'audio' || firstMedia.media_type?.startsWith('audio')) {
                  previewText = '🎵 Audio';
                } else if (firstMedia.media_type === 'link') {
                  try {
                    const url = new URL(firstMedia.media_url || firstMedia.file_url);
                    previewText = `🔗 ${url.hostname.replace('www.', '')}`;
                  } catch {
                    previewText = '🔗 Link';
                  }
                } else {
                  const fileName = firstMedia.file_name || 'Document';
                  previewText = `📄 ${fileName}`;
                }
              }

              setGroupChats(prev => prev.map(g =>
                String(g.id) === String(groupId)
                  ? { ...g, subject: previewText || g.subject }
                  : g
              ));
            }

            // mark group as opened so subsequent openings aren't treated as "first open"
            try { openedGroupsRef.current.add(String(groupId)); } catch (_) { }
          }
        } catch (msgError) {
          // Silently handle network errors and expected HTTP errors
          const isNetworkError = msgError?.code === 'ERR_INSUFFICIENT_RESOURCES' ||
            msgError?.code === 'ERR_NETWORK' ||
            msgError?.message === 'Network Error';
          const isExpectedError = msgError?.response?.status && [400, 404, 500].includes(msgError.response.status);

          if (!isNetworkError && !isExpectedError) {
            console.error('Error fetching messages:', msgError);
          }
        }

        // Fetch group info — make it optional and non-blocking to prevent resource exhaustion
        // Only fetch if we don't already have info for this group
        if (!groupInfo || String(groupInfo?.id || groupInfo?.group_id) !== String(groupId)) {
          // Use setTimeout to make it non-blocking and prevent resource exhaustion
          setTimeout(async () => {
            try {
              const infoResponse = await axiosInstance.get(`/chat/groups/${groupId}/info`);
              if (infoResponse && infoResponse.data && infoResponse.data.success) {
                setGroupInfo(infoResponse.data.data);
              }
            } catch (err) {
              // Silently ignore all errors for group info (it's optional)
              // Don't try fallback to avoid more requests
            }
          }, 100); // Small delay to not block message fetching
        }
      } catch (error) {
        // Silently handle network errors and resource exhaustion
        const isNetworkError = error?.code === 'ERR_INSUFFICIENT_RESOURCES' ||
          error?.code === 'ERR_NETWORK' ||
          error?.message === 'Network Error';

        if (!isNetworkError) {
          console.error('❌ Error fetching messages/info:', error);
        }
      }
      finally {
        // reset origin flag once we've handled the selection
        lastSelectFromPanelRef.current = false;
        fetchingRef.current = false;
      }
    };

    fetchMessagesAndInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, currentGroupId, isMobile, showMainChat, formatMessage]); // currentGroupId is memoized from groupChats

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

  const handleChatSelect = async (index, options = {}) => {
    // remember origin for the upcoming effect
    lastSelectFromPanelRef.current = !!(options && options.fromPanel);
    // If selection came from the chats panel (user clicked), mark read on server then select.
    try {
      if (options && options.fromPanel) {
        const groupId = groupChats[index]?.id;
        const incomingUnread = typeof options.unreadCount === 'number' ? Number(options.unreadCount) : Number(groupChats[index]?.unread ?? 0);
        if (groupId && incomingUnread > 0) {
          // Try bulk read-all first
          let markedAll = false;
          try {
            const res = await axiosInstance.put(`/chat/groups/${groupId}/messages/read-all`);
            if (res && res.status >= 200 && res.status < 300) markedAll = true;
          } catch (e) {
            const status = e?.response?.status;
            console.warn('⚠️ Mark read-all failed for group (from panel)', groupId, status || e?.message || e);
            // If read-all is not supported (404/405), we'll fall back to per-message marking
            if (status !== 404 && status !== 405) {
              // non-fatal - other errors may require retry later
            }
          }

          if (!markedAll) {
            try {
              // fetch messages so we can mark each individually
              const messagesRes = await axiosInstance.get(`/chat/groups/${groupId}/messages`);
              const msgs = (messagesRes?.data?.data) || [];
              if (msgs.length > 0) {
                // mark each message as read (best-effort). Try PUT then POST if not allowed.
                const markResults = await Promise.allSettled(msgs.map(async (m) => {
                  const id = m?.id;
                  if (!id) return { id, ok: false };
                  // Try put
                  try {
                    const r = await axiosInstance.put(`/chat/groups/${groupId}/messages/${id}/read`);
                    return { id, ok: (r && r.status >= 200 && r.status < 300) };
                  } catch (err) {
                    // Try post fallback
                    try {
                      const r2 = await axiosInstance.post(`/chat/groups/${groupId}/messages/${id}/read`);
                      return { id, ok: (r2 && r2.status >= 200 && r2.status < 300) };
                    } catch (err2) {
                      console.warn('Failed to mark message read', groupId, id, err2?.response?.status || err2?.message || err2);
                      return { id, ok: false };
                    }
                  }
                }));
                const successful = markResults.filter(r => r.status === 'fulfilled' && r.value && r.value.ok).length;
                console.debug(`Marked ${successful}/${msgs.length} messages read for group ${groupId}`);
              }
            } catch (e2) {
              console.warn('Failed to fetch messages to mark individually for group', groupId, e2?.response?.status || e2?.message || e2);
            }
          }

          // update local unread state for that group regardless (optimistic)
          setGroupChats(prev => prev.map(g => String(g.id) === String(groupChats[index]?.id) ? { ...g, unread: 0 } : g));

          // Re-fetch unread-count from server to confirm messages were marked read
          try {
            // try a normal GET first
            let rr = await axiosInstance.get(`/chat/groups/${groupId}/unread-count`);
            // if server still returns the old value, attempt a cache-busting retry
            const parseUnread = (payload) => {
              if (!payload) return 0;
              if (typeof payload.data === 'number') return payload.data;
              if (payload.data && typeof payload.data.unread_count === 'number') return payload.data.unread_count;
              if (payload.data && typeof payload.data.unread === 'number') return payload.data.unread;
              if (payload.data && typeof payload.data.count === 'number') return payload.data.count;
              if (typeof payload.count === 'number') return payload.count;
              return Number(payload.data) || 0;
            };

            let serverCount = parseUnread(rr?.data);
            if (serverCount > 0) {
              console.debug('GroupChat: unread-count still > 0 immediately after mark-all, retrying with cache-bust', groupId, serverCount);
              try {
                rr = await axiosInstance.get(`/chat/groups/${groupId}/unread-count`, { params: { _cacheBust: Date.now() }, headers: { 'Cache-Control': 'no-cache' } });
                serverCount = parseUnread(rr?.data);
                console.debug('GroupChat: cache-bust unread-count response', groupId, serverCount, rr?.data);
              } catch (e) {
                console.warn('GroupChat: cache-bust unread-count retry failed', groupId, e?.response?.status || e?.message || e);
              }
            }
            // serverCount already resolved above
            // update UI with actual server value (in case marking didn't succeed)
            setGroupChats(prev => prev.map(g => String(g.id) === String(groupId) ? { ...g, unread: serverCount } : g));
            if (serverCount > 0) {
              console.warn('GroupChat: unread-count still > 0 after mark attempts for', groupId, serverCount);
            }
          } catch (e) {
            console.warn('GroupChat: failed to refresh unread-count for', groupId, e?.response?.status || e?.message || e);
          }
        }
      }
    } catch (e) {
      console.warn('Error while marking group read on select', e);
    } finally {
      setSelectedChat(index);
      if (isMobile) setShowMainChat(true);
    }
  };

  const handleBackToChats = () => {
    setShowMainChat(false);
    setSelectedChat(null);
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
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      text: trimmedText,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
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
  const chatTitle = selectedChatData ? selectedChatData.group_name : "Group Chat";

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

  const userRole = useMemo(() => {
    const currentUserEmail = user?.email;
    if (!currentUserEmail || !groupMembers.length) return null;
    const member = groupMembers.find(m => m.email === currentUserEmail);
    return member?.role || null;
  }, [user?.email, groupMembers]);

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
      avatars: ["M", "A"]
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
      avatars: ["M", "A"]
    }
  ];

  const currentUser = {
    id: user?.id,
    name: user?.name || "User",
    initials: user?.name?.charAt(0)?.toUpperCase() || "U",
    photo: user?.photo || user?.user_photo,
    user_photo: user?.user_photo || user?.photo,
    status: "Online"
  };

  if (loading) {
    return <div className="home-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading groups...</div>;
  }

  return (
    <div className="home-container">
      <ChatsPanel
        groupChats={groupChats}
        selectedChat={selectedChat}
        onChatSelect={handleChatSelect}
        isMobile={isMobile}
        showMainChat={showMainChat}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
      />

      <MainChat
        messages={messages}
        chatTitle={chatTitle}
        isMobile={isMobile}
        showMainChat={showMainChat}
        onBackToChats={handleBackToChats}
        onSendMessage={handleSendMessage}
        activeSection={activeInfoSection}
        onCloseSection={() => setActiveInfoSection(null)}
        expandedSection={expandedSection}
        groupInfo={groupInfo}
        setExpandedSection={setExpandedSection}
        contentResources={contentResources}
        groupMediaItems={groupMediaItems}
        groupMembers={groupMembers}
        currentUserEmail={user?.email}
        groupId={selectedChatData?.id}
        onMessageEdited={handleMessageEdited}
        onGroupNameClick={isMobile ? () => setShowRightSidebarMobile(true) : undefined}
        isSendingMessage={isSendingMessage}
        userRole={userRole}
      />

      <RightSidebar
        groupInfo={groupInfo}
        calendarEvents={calendarEvents}
        user={currentUser}
        isMobile={isMobile}
        showMainChat={showMainChat}
        activeSection={activeInfoSection}
        onSelectSection={(section) => {
          setActiveInfoSection(section);
          // On mobile, close the right sidebar and show main chat when a section is selected
          if (isMobile && section) {
            setShowRightSidebarMobile(false);
            setShowMainChat(true);
          }
        }}
        contentSummary={contentResources}
        mediaSummary={mediaSummary}
        memberCount={groupMembers.length}
        showMobile={showRightSidebarMobile}
        onCloseMobile={() => setShowRightSidebarMobile(false)}
        onOpenSidebar={() => {
          setShowRightSidebarMobile(false); // Close right sidebar first
          // Small delay to ensure right sidebar closes before main sidebar opens
          setTimeout(() => {
            if (onOpenSidebar) onOpenSidebar(); // Then open main sidebar
          }, 100);
        }}
      />
    </div>
  );
}
