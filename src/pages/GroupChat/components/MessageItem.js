import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  ArrowBendUpLeft,
  CopySimple,
  PencilSimple,
  Trash,
  Plus,
} from '@phosphor-icons/react';
import MessageItemMedia from './MessageItemMedia';
import { getDisplayText } from '../utils/messageItemUtils';
import { smartToast } from '../../../API/toastManager';
import '../GroupChat.css';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🥰'];

const LONG_PRESS_MS = 520;

const MessageItem = ({
  message,
  onDeleteMessage,
  onEditMessage,
  currentUser,
  currentUserEmail,
  onMediaClick,
  userRole,
  onReply,
  onReact,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
  /** Bubble column only (max-width ~70%); used so the highlight matches real size, not full chat row. */
  const messageContentRef = useRef(null);
  const sheetRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const resolvedCurrentEmail = currentUserEmail || currentUser?.email || currentUser?.user_email || null;
  const messageEmail = message.senderEmail || message.sender_email || null;
  const emailMatch = messageEmail && resolvedCurrentEmail && messageEmail.toLowerCase() === resolvedCurrentEmail.toLowerCase();
  const nameMatch = message.sender === 'You' || message.sender === currentUser?.name;
  const isOwnMessage = emailMatch || nameMatch;

  const isGroupAdminRole =
    userRole === 'Administrator' ||
    userRole === 'Super_Admin' ||
    (typeof userRole === 'string' && userRole.toLowerCase().includes('super_admin'));

  const canReply = Boolean(onReply) && !message.is_deleted && !String(message.id || '').startsWith('temp-');
  const canReact = Boolean(onReact) && !message.is_deleted && !String(message.id || '').startsWith('temp-');
  const canModerate = isOwnMessage || isGroupAdminRole;
  const canOpenSheet = canModerate || canReply || canReact;

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const readAnchorRect = useCallback(() => {
    const el = messageContentRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, []);

  const openContextSheet = useCallback(() => {
    if (!canOpenSheet) return;
    const rect = readAnchorRect();
    if (!rect?.width) return;
    setShowEmojiPicker(false);
    setAnchorRect(rect);
    setShowContextMenu(true);
  }, [canOpenSheet, readAnchorRect]);

  const closeContextSheet = useCallback(() => {
    setShowContextMenu(false);
    setAnchorRect(null);
    setShowEmojiPicker(false);
  }, []);

  const handleRightClick = (e) => {
    if (!canOpenSheet) return;
    e.preventDefault();
    openContextSheet();
  };

  const handleTouchStart = (e) => {
    if (!canOpenSheet || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      openContextSheet();
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = (e) => {
    if (longPressTimerRef.current == null || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartRef.current.x);
    const dy = Math.abs(t.clientY - touchStartRef.current.y);
    if (dx + dy > 14) clearLongPress();
  };

  const handleTouchEnd = () => {
    clearLongPress();
  };

  const handleReply = () => {
    onReply?.(message);
    closeContextSheet();
  };

  const handlePickReaction = (emoji) => {
    onReact?.(message.id, emoji);
    closeContextSheet();
  };

  const handleEmojiPickerSelect = (emojiData) => {
    const emoji = emojiData?.emoji;
    if (emoji) handlePickReaction(emoji);
    else setShowEmojiPicker(false);
  };

  const handleCopy = async () => {
    const text = String(displayText || message.message || message.text || '').trim();
    const toCopy = text || (finalMedia.length ? 'Media message' : '');
    if (!toCopy) {
      smartToast.error('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(toCopy);
      smartToast.success('Copied');
      closeContextSheet();
    } catch {
      smartToast.error('Could not copy');
    }
  };

  const handleDelete = () => {
    onDeleteMessage(message.id);
    closeContextSheet();
  };

  const handleEdit = () => {
    setIsEditing(true);
    closeContextSheet();
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
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && showContextMenu) closeContextSheet();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showContextMenu, closeContextSheet]);

  useEffect(() => {
    if (!showContextMenu) return;
    const tick = () => {
      const el = messageContentRef.current;
      if (!el) return;
      const next = el.getBoundingClientRect();
      setAnchorRect(next);
      if (next.bottom < -80 || next.top > window.innerHeight + 80) closeContextSheet();
    };
    tick();
    const ro = new ResizeObserver(() => requestAnimationFrame(tick));
    if (messageContentRef.current) ro.observe(messageContentRef.current);
    const scrollOpts = { capture: true, passive: true };
    const onScrollOrResize = () => requestAnimationFrame(tick);
    window.addEventListener('scroll', onScrollOrResize, scrollOpts);
    document.addEventListener('scroll', onScrollOrResize, scrollOpts);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScrollOrResize, scrollOpts);
      document.removeEventListener('scroll', onScrollOrResize, scrollOpts);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [showContextMenu, closeContextSheet]);

  /** Same structure/classes as the in-thread bubble (read-only in portal). */
  const renderBubbleColumn = (preview) => (
    <>
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
      {message.parent_message && (message.parent_message.text || message.parent_message.sender) && (
        <div className={`message-reply-quote ${isOwnMessage ? 'message-reply-quote-own' : ''}`}>
          <span className="message-reply-quote-bar" aria-hidden />
          <div className="message-reply-quote-body">
            <span className="message-reply-quote-sender">{message.parent_message.sender || 'User'}</span>
            <span className="message-reply-quote-text">{message.parent_message.text || '…'}</span>
          </div>
        </div>
      )}
      {displayText && (
        <div className="message-text">
          {!preview && isEditing ? (
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
      <MessageItemMedia
        finalMedia={finalMedia}
        isOwnMessage={isOwnMessage}
        onMediaClick={preview ? undefined : onMediaClick}
      />
      {Array.isArray(message.reactions) && message.reactions.length > 0 && (
        <div className="message-reactions" aria-label="Reactions">
          {message.reactions.map((r, idx) => (
            <span
              key={`${r.emoji}-${idx}`}
              className={`message-reaction-chip${r.reactedByMe ? ' message-reaction-chip-mine' : ''}`}
            >
              <span className="message-reaction-emoji">{r.emoji}</span>
              {r.count > 1 ? <span className="message-reaction-count">{r.count}</span> : null}
            </span>
          ))}
        </div>
      )}
    </>
  );

  const anchorLayout = (() => {
    if (!anchorRect) return null;
    const pad = 10;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
    const cx = anchorRect.left + anchorRect.width / 2;
    const cxClamped = Math.max(pad + 100, Math.min(vw - pad - 100, cx));
    const barH = 56;
    const gap = 8;
    const barTop = Math.max(pad, anchorRect.top - gap - barH);
    const actionsTop = anchorRect.bottom + gap;
    const actionsMaxH = Math.max(120, window.innerHeight - actionsTop - pad);
    return { cxClamped, barTop, actionsTop, actionsMaxH, rect: anchorRect };
  })();

  const contextOverlay =
    showContextMenu &&
    anchorLayout &&
    createPortal(
      <div className="message-context-overlay" role="presentation" onClick={closeContextSheet}>
        {canReact && showEmojiPicker && (
          <>
            <div
              className="message-context-emoji-scrim"
              role="presentation"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(false);
              }}
            />
            <div
              className="message-context-emoji-modal"
              role="dialog"
              aria-label="Choose emoji"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="message-context-emoji-picker-wrap message-context-emoji-picker-wrap--modal">
                <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiPickerSelect} height={320} />
              </div>
            </div>
          </>
        )}

        <div className="message-context-float-layer">
          <div
            className={`message message-context-float-host ${isOwnMessage ? 'message-own' : 'message-other'}`}
            style={{
              position: 'fixed',
              top: anchorLayout.rect.top,
              left: anchorLayout.rect.left,
              width: anchorLayout.rect.width,
              height: anchorLayout.rect.height,
              zIndex: 5001,
              boxSizing: 'border-box',
            }}
            aria-hidden
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="message-content"
              style={{
                maxWidth: '100%',
                width: '100%',
                height: '100%',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {renderBubbleColumn(true)}
            </div>
          </div>

          {canReact && (
            <div
              className="message-context-reaction-bar message-context-reaction-bar--anchored"
              role="toolbar"
              aria-label="React"
              style={{
                position: 'fixed',
                left: `${anchorLayout.cxClamped}px`,
                top: `${anchorLayout.barTop}px`,
                transform: 'translateX(-50%)',
                zIndex: 5002,
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {QUICK_REACTION_EMOJIS.map((emo) => (
                <button
                  key={emo}
                  type="button"
                  className="message-context-reaction-emoji"
                  onClick={() => handlePickReaction(emo)}
                >
                  {emo}
                </button>
              ))}
              <button
                type="button"
                className="message-context-reaction-plus"
                aria-label="More emojis"
                onClick={() => setShowEmojiPicker((v) => !v)}
              >
                <Plus size={20} weight="bold" />
              </button>
            </div>
          )}

          <div
            ref={sheetRef}
            className="message-context-actions message-context-actions--anchored"
            role="dialog"
            aria-modal="true"
            aria-label="Message actions"
            style={{
              position: 'fixed',
              left: `${anchorLayout.cxClamped}px`,
              top: `${anchorLayout.actionsTop}px`,
              transform: 'translateX(-50%)',
              width: 'min(320px, calc(100vw - 20px))',
              maxHeight: anchorLayout.actionsMaxH,
              overflowY: 'auto',
              zIndex: 5002,
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {canReply && (
              <button type="button" className="message-context-action-row" onClick={handleReply}>
                <span>Reply</span>
                <ArrowBendUpLeft size={22} className="message-context-action-icon" aria-hidden />
              </button>
            )}
            <button type="button" className="message-context-action-row" onClick={handleCopy}>
              <span>Copy</span>
              <CopySimple size={22} className="message-context-action-icon" aria-hidden />
            </button>
            {isOwnMessage && (
              <button type="button" className="message-context-action-row" onClick={handleEdit}>
                <span>Edit</span>
                <PencilSimple size={22} className="message-context-action-icon" aria-hidden />
              </button>
            )}
            {(isOwnMessage || isGroupAdminRole) && (
              <button type="button" className="message-context-action-row message-context-action-row-danger" onClick={handleDelete}>
                <span>Delete</span>
                <Trash size={22} className="message-context-action-icon" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div
      className={`message ${isOwnMessage ? 'message-own' : 'message-other'}${showContextMenu ? ' message--context-open' : ''}`}
      ref={messageRef}
      onContextMenu={handleRightClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
      <div ref={messageContentRef} className="message-content">
        {renderBubbleColumn(false)}
      </div>
      {contextOverlay}
    </div>
  );
};

export default MessageItem;
