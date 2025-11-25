import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import ChatItem from './ChatItem';
import './ChatsPanel.css';

const ChatsPanel = ({
    groupChats,
    selectedChat,
    onChatSelect,
    isMobile,
    showMainChat
}) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('all');

    const filteredChats = groupChats.filter(chat => {
        const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || (activeTab === 'unread' && chat.unread > 0);
        return matchesSearch && matchesTab;
    });

    return (
        <div className={`chats-panel rounded-4 shadow-sm ${isMobile && showMainChat ? 'mobile-hidden' : ''}`}>
            <div className="chats-header">
                <h2 className="fw-semibold">Group Chats</h2>
            </div>
            <div className="chats-search">
                <MagnifyingGlass size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="chats-tabs">
                <button
                    className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All
                </button>
                <button
                    className={`tab ${activeTab === 'unread' ? 'active' : ''}`}
                    onClick={() => setActiveTab('unread')}
                >
                    Unread
                </button>
            </div>
            <div className="chats-list">
                {filteredChats.length === 0 ? (
                    <div className="no-chats-container">
                        <img src="/assets/GroupChat.png" alt="No chats" className="no-chats-image" />
                    </div>
                ) : (
                    filteredChats.map((chat, index) => {
                        const originalIndex = groupChats.indexOf(chat);
                        return (
                            <ChatItem
                                key={originalIndex}
                                chat={chat}
                                isActive={selectedChat === originalIndex}
                                onClick={() => onChatSelect(originalIndex)}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChatsPanel;

