import React, { useEffect, useRef } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import './MainChat.css';

const MainChat = ({
    messages,
    chatTitle,
    isMobile,
    showMainChat,
    onBackToChats,
    onSendMessage
}) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Also scroll when component becomes visible (e.g., on mobile when chat opens)
    useEffect(() => {
        if (showMainChat || !isMobile) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [showMainChat, isMobile]);

    return (
        <div className={`main-chat rounded-4 shadow-sm ${isMobile && !showMainChat ? 'mobile-hidden' : ''}`}>
            <div className="chat-header">
                {isMobile && (
                    <button className="back-to-chats-btn" onClick={onBackToChats}>
                        ←
                    </button>
                )}
                <h3>{chatTitle}</h3>
                <div className="chat-header-actions">
                    <button className="join-meeting-btn">Join Meeting</button>
                    <div className="search-icon-header">
                        <MagnifyingGlass size={20} />
                    </div>
                </div>
            </div>
            <div className="chat-messages" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <div className="no-messages-container">
                        <img src="/assets/GroupChat.png" alt="No messages" className="no-messages-image" />
                    </div>
                ) : (
                    <>
                        <div className="date-separator-wrapper">
                            <div className="date-separator">25 Sep 2025</div>
                        </div>
                        {messages.map((msg, index) => (
                            <MessageItem key={index} message={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>
            <ChatInput onSendMessage={onSendMessage} />
        </div>
    );
};

export default MainChat;

