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
  //const [socket, setSocket] = useState(null);
  //const [socketStatus, setSocketStatus] = useState('disconnected');
  const [groupChats, setGroupChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeInfoSection, setActiveInfoSection] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const formatMessage = useCallback((msg) => ({
    id: msg.id,
    sender: msg.sender_name,
    initials: msg.sender_name?.charAt(0)?.toUpperCase() || 'U',
    time: new Date(msg.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
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
          unread: 0,
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

          // If selected chat was deleted, we'll handle below; otherwise restore by id
          return formattedGroups;
        });

        // After state update, restore selectedChat index to the position of the same group id
        if (currentSelectedId) {
          const newIndex = formattedGroups.findIndex((g) => String(g.id) === String(currentSelectedId));
          if (newIndex !== -1) {
            setSelectedChat(newIndex);
          } else {
            // selected group was deleted
            setSelectedChat(formattedGroups.length > 0 ? 0 : null);
          }
        } else if (isInitial && formattedGroups.length > 0) {
          setSelectedChat(0);
        }
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

  // Fetch messages and group info when selected chat changes
  useEffect(() => {
    if (selectedChat === null || groupChats.length === 0) return;

    const fetchMessagesAndInfo = async () => {
      try {
        const groupId = groupChats[selectedChat]?.id;
        if (!groupId) return;

        // Join group via socket
        /*if (socket) {
          socket.emit('joinGroup', { groupId }, (ack) => {
            console.log('✅ Joined group:', ack);
          });
        }*/

        // Fetch messages
        const messagesResponse = await axiosInstance.get(`/chat/groups/${groupId}/messages`);
        if (messagesResponse.data.success) {
          const formattedMessages = messagesResponse.data.data.map((msg) => formatMessage(msg));
          setMessages(formattedMessages);
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
  }, [selectedChat, groupChats /*,socket*/]);

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
    setShowMainChat(false);
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
    setActiveInfoSection((prev) => (prev === section ? null : section));
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

      {selectedChatData ? (
        <MainChat
          messages={messages}
          chatTitle={chatTitle}
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
          groupId={selectedChatData?.id}
          onMessageEdited={handleMessageEdited}
          isSendingMessage={isSendingMessage}
        />
      ) : (
        <div className="main-chat-placeholder">Select a group chat to get started.</div>
      )}

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
      />
    </div>
  );
}