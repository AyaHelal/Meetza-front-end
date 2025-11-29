import React, { useState, useEffect, useContext } from 'react';
//import { io } from 'socket.io-client';
import './GroupChat.css';
import ChatsPanel from './components/ChatsPanel';
import MainChat from './components/MainChat';
import RightSidebar from './components/RightSidebar';
import axiosInstance from '../../API/axiosInstance';
import { AuthContext } from '../../context/AuthContext';

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
  const [expandedSection, setExpandedSection] = useState(null);

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
            ? new Date(g.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
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
          const formattedMessages = messagesResponse.data.data.map((msg) => ({
            id: msg.id,
            sender: msg.sender_name,
            initials: msg.sender_name?.charAt(0)?.toUpperCase() || 'U',
            time: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            text: msg.message,
            date: new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            senderPhoto: msg.sender_photo,
            senderEmail: msg.sender_email
          }));
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

  const handleSendMessage = async (messageText) => {
    if (selectedChat === null) return;

    const groupId = groupChats[selectedChat]?.id;
    if (!groupId) return;

    // Optimistic UI: show message locally immediately
    const newMessage = {
      sender: user?.name || "You",
      initials: user?.name?.charAt(0)?.toUpperCase() || 'ME',
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      text: messageText,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      senderPhoto: user?.photo || null,
      senderEmail: user?.email || null,
      _optimistic: true
    };
    setMessages((prev) => [...prev, newMessage]);

    // If socket is connected, send via socket for realtime
    /*if (socket && socket.connected) {
      try {
        socket.emit('sendMessage', { groupId, message: messageText }, (ack) => {
          console.log('✅ Message sent via socket:', ack);
        });
        return;
      } catch (err) {
        console.warn('⚠️ Socket emit failed, falling back to REST POST', err);
      }
    }*/

    // Fallback: POST message to REST endpoint so messages are persisted
    try {
      const res = await axiosInstance.post(`/chat/groups/${groupId}/messages`, { message: messageText });
      console.log('✅ Message POST fallback response:', res?.data);
      // Optionally we could replace/update the optimistic message with server one using res.data
    } catch (err) {
      console.error('❌ REST fallback failed to send message:', err);
      // You may choose to mark the optimistic message as unsent here or queue for retry
    }
  };

  const selectedChatData = selectedChat !== null ? groupChats[selectedChat] : null;
  const chatTitle = selectedChatData ? selectedChatData.group_name : "Group Chat";

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
    name: user?.name || "User",
    initials: user?.name?.charAt(0)?.toUpperCase() || "U",
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
      />

      <MainChat
        messages={messages}
        chatTitle={chatTitle}
        isMobile={isMobile}
        showMainChat={showMainChat}
        onBackToChats={handleBackToChats}
        onSendMessage={handleSendMessage}
        expandedSection={expandedSection}
        groupInfo={groupInfo}
        setExpandedSection={setExpandedSection}
      />

      <RightSidebar
        groupInfo={groupInfo}
        calendarEvents={calendarEvents}
        user={currentUser}
        isMobile={isMobile}
        showMainChat={showMainChat}
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      />
    </div>
  );
}
