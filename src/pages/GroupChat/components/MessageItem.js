import React, { useState, useRef, useEffect } from 'react';
import './MessageItem.css';

const MessageItem = ({ message, groupId, onDeleteMessage, onEditMessage, currentUser }) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);
    const messageRef = useRef(null);
    const menuRef = useRef(null);

    const handleRightClick = (e) => {
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
        if (editText.trim() && editText !== message.text) {
            onEditMessage(message.id, editText.trim());
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
        <div className="message" ref={messageRef} onContextMenu={handleRightClick}>
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
                        message.text
                    )}
                </div>
            </div>
            {showContextMenu && (
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

