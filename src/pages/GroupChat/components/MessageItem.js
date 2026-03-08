import React, { useState, useRef, useEffect } from 'react';
import MessageItemMedia from './MessageItemMedia';
import { getDisplayText } from '../utils/messageItemUtils';
import '../GroupChat.css';

const MessageItem = ({
  message,
  groupId,
  onDeleteMessage,
  onEditMessage,
  currentUser,
  currentUserEmail,
  onMediaClick,
  userRole,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message || message.text || '');

  const isLinkMessage = message.message && /^https?:\/\/\S+$/i.test(message.message.trim());
  const finalMedia =
    message.media?.length > 0
      ? message.media
      : isLinkMessage
        ? [{ media_type: 'link', media_url: message.message }]
        : [];

  const displayText = getDisplayText(message, finalMedia);

  useEffect(() => {
    setEditText(message.message || message.text || '');
  }, [message.message, message.text]);

  const messageRef = useRef(null);
  const menuRef = useRef(null);

  const resolvedCurrentEmail = currentUserEmail || currentUser?.email || currentUser?.user_email || null;
  const messageEmail = message.senderEmail || message.sender_email || null;
  const emailMatch = messageEmail && resolvedCurrentEmail && messageEmail.toLowerCase() === resolvedCurrentEmail.toLowerCase();
  const nameMatch = message.sender === 'You' || message.sender === currentUser?.name;
  const isOwnMessage = emailMatch || nameMatch;

  const handleRightClick = (e) => {
    if (!isOwnMessage && userRole !== 'Administrator') return;
    e.preventDefault();
    const isMobile = window.innerWidth <= 768;
    if (isMobile && messageRef.current) {
      const rect = messageRef.current.getBoundingClientRect();
      const menuWidth = 140;
      const leftPosition = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left + rect.width / 2 - menuWidth / 2));
      setMenuPosition({ x: leftPosition, y: rect.bottom + 10 });
    } else {
      setMenuPosition({ x: e.clientX, y: e.clientY });
    }
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
    const currentText = message.message || message.text || '';
    if (trimmedText && trimmedText !== currentText) {
      onEditMessage(message.id, trimmedText);
    } else if (!trimmedText) {
      setEditText(message.message || message.text || '');
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditText(message.message || message.text || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleEditSubmit();
    else if (e.key === 'Escape') handleEditCancel();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowContextMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}
      ref={messageRef}
      onContextMenu={isOwnMessage || userRole === 'Administrator' ? handleRightClick : undefined}
    >
      {!isOwnMessage && (
        <div className="message-avatar">
          {message.senderPhoto ? (
            <img src={message.senderPhoto || undefined} alt={message.sender} className="message-avatar-img" />
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
        {displayText && (
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
              displayText
            )}
          </div>
        )}
        <MessageItemMedia finalMedia={finalMedia} isOwnMessage={isOwnMessage} onMediaClick={onMediaClick} />
      </div>
      {showContextMenu && (isOwnMessage || userRole === 'Administrator') && (
        <div className="context-menu" ref={menuRef} style={{ left: menuPosition.x, top: menuPosition.y }}>
          {isOwnMessage && <button onClick={handleEdit}>Edit</button>}
          <button onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  );
};

export default MessageItem;
