import React from 'react';
import './MessageItem.css';

const MessageItem = ({ message }) => {
    return (
        <div className="message">
            <div className="message-avatar">
                {message.senderPhoto ? (
                    <img src={message.senderPhoto} alt={message.sender} className="message-avatar-img" />
                ) : (
                    <span>{message.initials}</span>
                )}
            </div>
            <div className="message-content">
                <div className="message-header">
                    <span className="message-sender">{message.sender}</span>
                    <span className="message-time">{message.time}</span>
                </div>
                <div className="message-text">{message.text}</div>
            </div>
        </div>
    );
};

export default MessageItem;

