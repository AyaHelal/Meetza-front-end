import React from 'react';
import './MessageItem.css';

const MessageItem = ({ message, currentUserEmail }) => {
    // Check if message is from current user by comparing email
    const emailMatch = message.senderEmail && currentUserEmail &&
        message.senderEmail.toLowerCase() === currentUserEmail.toLowerCase();
    // Fallback: check if sender name is "You" (for optimistic messages)
    const nameMatch = message.sender === "You";
    const isOwnMessage = emailMatch || nameMatch;

    return (
        <div className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}>
            {!isOwnMessage && (
                <div className="message-avatar">
                    {message.senderPhoto ? (
                        <img src={message.senderPhoto} alt={message.sender} className="message-avatar-img" />
                    ) : (
                        <span>{message.initials}</span>
                    )}
                </div>
            )}
            <div className="message-content">
                {!isOwnMessage && (
                    <div className="message-header">
                        <span className="message-sender">{message.sender}</span>
                        <span className="message-time">{message.time}</span>
                    </div>
                )}
                {isOwnMessage && (
                    <div className="message-header message-header-own">
                        <span className="message-time">{message.time}</span>
                    </div>
                )}
                <div className="message-text">{message.text}</div>
            </div>
        </div>
    );
};

export default MessageItem;

