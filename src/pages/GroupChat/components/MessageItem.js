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
  onReply,
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

  const isGroupAdminRole =
    userRole === 'Administrator' ||
    userRole === 'Super_Admin' ||
    (typeof userRole === 'string' && userRole.toLowerCase().includes('super_admin'));

  const handleRightClick = (e) => {
    const canModerate = isOwnMessage || isGroupAdminRole;
    const canReply = Boolean(onReply) && !message.is_deleted && !String(message.id || "").startsWith("temp-");
    if (!canModerate && !canReply) return;
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

  const handleReply = () => {
    onReply?.(message);
    setShowContextMenu(false);
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
      onContextMenu={handleRightClick}
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
            {onReply && !message.is_deleted && !String(message.id || "").startsWith("temp-") && (
              <button type="button" className="message-reply-btn" onClick={handleReply}>
                Reply
              </button>
            )}
            <span className="message-time">{message.time}</span>
          </div>
        )}
        {isOwnMessage && (
          <div className="message-header message-header-own">
            {onReply && !message.is_deleted && !String(message.id || "").startsWith("temp-") && (
              <button type="button" className="message-reply-btn message-reply-btn-own" onClick={handleReply}>
                Reply
              </button>
            )}
            <span className="message-time">{message.time}</span>
          </div>
        )}
        {message.parent_message && (message.parent_message.text || message.parent_message.sender) && (
          <div className={`message-reply-quote ${isOwnMessage ? "message-reply-quote-own" : ""}`}>
            <span className="message-reply-quote-bar" aria-hidden />
            <div className="message-reply-quote-body">
              <span className="message-reply-quote-sender">{message.parent_message.sender || "User"}</span>
              <span className="message-reply-quote-text">{message.parent_message.text || "…"}</span>
            </div>
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
      {showContextMenu && (
        <div className="context-menu" ref={menuRef} style={{ left: menuPosition.x, top: menuPosition.y }}>
          {onReply && !message.is_deleted && !String(message.id || "").startsWith("temp-") && (
            <button type="button" onClick={handleReply}>Reply</button>
          )}
          {isOwnMessage && <button type="button" onClick={handleEdit}>Edit</button>}
          {(isOwnMessage || isGroupAdminRole) && (
            <button type="button" onClick={handleDelete}>Delete</button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
