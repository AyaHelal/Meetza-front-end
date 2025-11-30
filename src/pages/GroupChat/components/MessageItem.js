import React, { useState, useRef, useEffect } from 'react';
import '../GroupChat.css';

const MessageItem = ({ message, groupId, onDeleteMessage, onEditMessage, currentUser, currentUserEmail }) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);

    // Update editText when message.text changes (e.g., after successful edit)
    useEffect(() => {
        setEditText(message.text);
    }, [message.text]);
    const messageRef = useRef(null);
    const menuRef = useRef(null);

    // Determine ownership: prefer `currentUserEmail` prop (from MainChat), fallback to `currentUser` object
    const resolvedCurrentEmail = currentUserEmail || currentUser?.email || currentUser?.user_email || null;
    const messageEmail = message.senderEmail || message.sender_email || null;
    const emailMatch = messageEmail && resolvedCurrentEmail && messageEmail.toLowerCase() === resolvedCurrentEmail.toLowerCase();
    const nameMatch = message.sender === 'You' || message.sender === currentUser?.name;
    const isOwnMessage = emailMatch || nameMatch;

    const handleRightClick = (e) => {
        // Only show context menu for own messages
        if (!isOwnMessage) {
            return;
        }
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleDelete = () => {
        onDeleteMessage(message.id);
        setShowContextMenu(false);
    };

    const handleEdit = () => {
        setIsEditing(true);
        setShowContextMenu(false);
    };

    const handleEditSubmit = () => {
        const trimmedText = editText.trim();
        if (trimmedText && trimmedText !== message.text) {
            onEditMessage(message.id, trimmedText);
        } else if (!trimmedText) {
            // If empty, cancel the edit
            handleEditCancel();
            return;
        }
        setIsEditing(false);
    };

    const handleEditCancel = () => {
        setEditText(message.text);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleEditSubmit();
        } else if (e.key === 'Escape') {
            handleEditCancel();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowContextMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div
            className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}
            ref={messageRef}
            onContextMenu={isOwnMessage ? handleRightClick : undefined}
        >
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
                <div className="message-text">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={handleEditSubmit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="edit-input"
                        />
                    ) : (
                        message.text || ''
                    )}
                </div>
            </div>
            {showContextMenu && isOwnMessage && (
                <div
                    className="context-menu"
                    ref={menuRef}
                    style={{ left: menuPosition.x, top: menuPosition.y }}
                >
                    <button onClick={handleEdit}>Edit</button>
                    <button onClick={handleDelete}>Delete</button>
                </div>
            )}
        </div>
    );
};

export default MessageItem;