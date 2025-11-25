import React from 'react';
import './ChatItem.css';

const ChatItem = ({ chat, isActive, onClick }) => {
    return (
        <div
            className={`chat-item ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="chat-avatar">
                {chat.avatarImage ? (
                    <img src={chat.avatarImage} alt={chat.name} className="chat-avatar-img" />
                ) : (
                    <span>{chat.avatar}</span>
                )}
            </div>
            <div className="chat-info">
                <div className="chat-name-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-date">{chat.date}</span>
                </div>
                <div className="chat-subject-row">
                    <span className="chat-subject">{chat.subject}</span>
                    {chat.unread > 0 && (
                        <span className="unread-badge">{chat.unread}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatItem;

