import React, { useState, useEffect } from 'react';
import './GroupChat.css';
import LeftNavbar from './components/LeftNavbar';
import ChatsPanel from './components/ChatsPanel';
import MainChat from './components/MainChat';
import RightSidebar from './components/RightSidebar';

export default function GroupChat() {
  const [selectedChat, setSelectedChat] = useState(0);
  const [activeNav, setActiveNav] = useState('messages');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMainChat, setShowMainChat] = useState(false);

  // Add class to body when GroupChat is mounted to prevent global scroll
  useEffect(() => {
    document.documentElement.classList.add('group-chat-active');
    document.body.classList.add('group-chat-active');

    return () => {
      document.documentElement.classList.remove('group-chat-active');
      document.body.classList.remove('group-chat-active');
    };
  }, []);
  const [messages, setMessages] = useState([
    {
      sender: "Farida Emad",
      initials: "FE",
      time: "8:20 PM",
      text: "انا شايفة ان احنا عايزين نحل المشكلة دي بسرعه",
      date: "25 Sep 2025"
    },
    {
      sender: "Shahd",
      initials: "S",
      time: "8:20 PM",
      text: "انا شايفة كده بردو"
    }
  ]);

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

  const handleSendMessage = (messageText) => {
    const newMessage = {
      sender: "You",
      initials: "ME",
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      text: messageText,
      date: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    };
    setMessages([...messages, newMessage]);
  };

  // Data
  const groupChats = [
    {
      name: "Dr Dawlat Abdelaziz",
      date: "25 sep",
      subject: "OOP 1st semester",
      unread: 2,
      avatar: "DA",
      avatarImage: "/assets/grp-poster.png"
    },
    {
      name: "Dr Dawlat Abdelaziz",
      date: "25 sep",
      subject: "OOP 1st semester",
      unread: 2,
      avatar: "DA",
      avatarImage: "/assets/grp-poster.png"
    },
    {
      name: "Dr Dawlat Abdelaziz",
      date: "25 sep",
      subject: "OOP 1st semester",
      unread: 2,
      avatar: "DA",
      avatarImage: "/assets/grp-poster.png"
    }
  ];

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
    name: "Farida Emad",
    initials: "FE",
    status: "Online"
  };

  const selectedChatData = groupChats[selectedChat];
  const chatTitle = selectedChatData ? selectedChatData.subject : "Group Chat";

  return (
    <div className="home-container">
      <LeftNavbar activeNav={activeNav} setActiveNav={setActiveNav} />

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
      />

      <RightSidebar
        calendarEvents={calendarEvents}
        user={currentUser}
        isMobile={isMobile}
        showMainChat={showMainChat}
      />
    </div>
  );
}
