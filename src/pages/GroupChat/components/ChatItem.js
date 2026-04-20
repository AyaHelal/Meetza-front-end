import React from 'react';
import './ChatItem.css';

const ChatItem = ({ chat, isActive, onClick }) => {
    const [imgOk, setImgOk] = React.useState(true);
    const fallbackGroup = "/assets/group-standard.png";
    return (
        <div
            className={`chat-item ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="chat-avatar">
                {chat.avatarImage && imgOk ? (
                    <img
                        src={chat.avatarImage || undefined}
                        alt={chat.name}
                        className="chat-avatar-img"
                        onError={() => setImgOk(false)}
                    />
                ) : (
                    <img
                        src={fallbackGroup}
                        alt={chat.name || "Group"}
                        className="chat-avatar-img"
                    />
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

