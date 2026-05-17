import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  ArrowBendUpLeft,
  CopySimple,
  PencilSimple,
  Trash,
  Plus,
  Smiley,
} from '@phosphor-icons/react';
import MessageItemMedia from './MessageItemMedia';
import {
  getDisplayText,
  viewerLabelForActor,
  totalReactionCount,
  reactionSheetRows,
} from '../utils/messageItemUtils';
import {
  useMessageItemPermissions,
  useMessageItemContextMenu,
  useMessageItemReactions,
  useMessageItemEditing,
  useMessageItemSearchHighlight,
} from '../hooks';
import { smartToast } from '../../../API/toastManager';
import '../GroupChat.css';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🥰'];

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
  searchWord,
  isSearchMatch,
  isActiveSearchResult,
  onRegisterMessageEl,
}) => {
  const messageRef = useRef(null);
  const messageContentRef = useRef(null);
  const reactionPillRef = useRef(null);
  const sheetRef = useRef(null);

  const {
    isOwnMessage,
    isGroupAdminRole,
    canReply,
    canReact,
    canOpenSheet,
    resolvedCurrentEmail,
  } = useMessageItemPermissions({
    message,
    currentUser,
    currentUserEmail,
    userRole,
    onReply,
    onReact,
  });

  const {
    showContextMenu,
    anchorRect,
    showEmojiPicker,
    setShowEmojiPicker,
    handleRightClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    closeContextSheet,
  } = useMessageItemContextMenu({
    canOpenSheet,
    messageContentRef,
  });

  const {
    reactionSheet,
    setReactionSheet,
    toggleReactionSheet,
  } = useMessageItemReactions({
    messageId: message.id,
    reactionPillRef,
  });

  const {
    isEditing,
    editText,
    setEditText,
    setIsEditing,
    handleEdit,
    handleEditSubmit,
    handleEditKeyDown,
  } = useMessageItemEditing({
    message,
    onEditMessage,
  });

  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);

  const handleEditEmojiClick = (emojiData) => {
    setEditText((prev) => prev + emojiData.emoji);
    setShowEditEmojiPicker(false);
  };

  useEffect(() => {
    if (!isEditing) setShowEditEmojiPicker(false);
  }, [isEditing]);

  const { renderHighlighted } = useMessageItemSearchHighlight({
    searchWord,
    isSearchMatch,
  });

  const isLinkMessage = message.message && /^https?:\/\/\S+$/i.test(message.message.trim());
  const finalMedia =
    message.media?.length > 0
      ? message.media
      : isLinkMessage
        ? [{ media_type: 'link', media_url: message.message }]
        : [];

  const displayText = getDisplayText(message, finalMedia);

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

  const onEditClick = () => {
    handleEdit();
    closeContextSheet();
  };

  const setOuterRef = useCallback(
    (el) => {
      messageRef.current = el;
      const id = message?.id;
      if (el && id != null) onRegisterMessageEl?.(id, el);
    },
    [message?.id, onRegisterMessageEl]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (reactionSheet) setReactionSheet(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reactionSheet, setReactionSheet]);

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
            <div className="edit-container position-relative d-flex align-items-center">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => {
                  if (!showEditEmojiPicker) handleEditSubmit();
                }}
                onKeyDown={handleEditKeyDown}
                autoFocus
                className="edit-input flex-grow-1"
              />
              <button
                type="button"
                className="edit-emoji-btn-inline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                style={{ background: 'none', border: 'none', padding: '0 8px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <Smiley size={20} />
              </button>
              {showEditEmojiPicker && (
                <div className="edit-emoji-picker-wrapper" onMouseDown={(e) => e.preventDefault()}>
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={handleEditEmojiClick}
                    height={300}
                    width={280}
                    searchDisabled
                    skinTonesDisabled
                  />
                </div>
              )}
            </div>
          ) : (
            renderHighlighted(displayText)
          )}
        </div>
      )}
      <MessageItemMedia
        finalMedia={finalMedia}
        isOwnMessage={isOwnMessage}
        onMediaClick={preview ? undefined : onMediaClick}
      />
      {Array.isArray(message.reactions) && message.reactions.length > 0 && (
        <button
          type="button"
          className={`message-reaction-summary-pill${isOwnMessage ? ' message-reaction-summary-pill--own' : ''}${reactionSheet ? ' message-reaction-summary-pill--open' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={Boolean(reactionSheet)}
          aria-label={`${totalReactionCount(message.reactions)} reactions. Show who reacted`}
          ref={reactionPillRef}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={toggleReactionSheet}
        >
          <span className="message-reaction-summary-emojis" aria-hidden>
            {message.reactions.map((r, i) => (
              <span key={`${r.emoji}-${i}`} className="message-reaction-summary-emoji">
                {r.emoji}
              </span>
            ))}
          </span>
          <span className="message-reaction-summary-total">{totalReactionCount(message.reactions)}</span>
        </button>
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
            {isOwnMessage && (!message.media || message.media.length === 0) && (
              <button type="button" className="message-context-action-row" onClick={onEditClick}>
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

  const reactionListRows = reactionSheet
    ? reactionSheetRows(message.reactions, reactionSheet.filter)
    : [];
  const reactionSheetTotal = totalReactionCount(message.reactions);

  const reactionPopoverLayout = (() => {
    if (!reactionSheet?.anchor) return null;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
    const maxW = Math.min(450, vw - 40);
    const maxH = Math.min(500, vh - 100);
    return { maxW, maxH };
  })();

  const reactionSheetOverlay =
    reactionSheet &&
    createPortal(
      <div className="message-reaction-popover-scrim" role="presentation" onClick={() => setReactionSheet(null)}>
        <div
          className="message-reaction-popover-panel"
          role="dialog"
          aria-modal="true"
          aria-label={`${reactionSheetTotal} reactions`}
          style={
            reactionPopoverLayout
               ? {
                  width: '100%',
                  maxWidth: `${reactionPopoverLayout.maxW}px`,
                  maxHeight: `${reactionPopoverLayout.maxH}px`,
                }
              : undefined
          }
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h3 className="message-reaction-sheet-title">
            {reactionSheetTotal} {reactionSheetTotal === 1 ? 'Reaction' : 'Reactions'}
          </h3>
          <div className="message-reaction-sheet-tabs">
            <button
              type="button"
              className={`message-reaction-sheet-tab message-reaction-sheet-tab--all${reactionSheet.filter === 'all' ? ' message-reaction-sheet-tab--active' : ''}`}
              onClick={() => setReactionSheet((prev) => ({ ...(prev || {}), filter: 'all' }))}
              aria-pressed={reactionSheet.filter === 'all'}
              aria-label="All reactions"
            >
              <span className="message-reaction-sheet-tab-all-emoji" aria-hidden>
                😊
              </span>
              <Plus size={14} weight="bold" className="message-reaction-sheet-tab-all-plus" aria-hidden />
            </button>
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                className={`message-reaction-sheet-tab${reactionSheet.filter === r.emoji ? ' message-reaction-sheet-tab--active' : ''}`}
                onClick={() => setReactionSheet((prev) => ({ ...(prev || {}), filter: r.emoji }))}
                aria-pressed={reactionSheet.filter === r.emoji}
              >
                <span className="message-reaction-sheet-tab-emoji">{r.emoji}</span>
                <span className="message-reaction-sheet-tab-count">{Math.max(1, Number(r.count) || 1)}</span>
              </button>
            ))}
          </div>
          <ul className="message-reaction-sheet-list">
            {reactionListRows.length === 0 ? (
              <li className="message-reaction-sheet-empty">No reactor details for this view.</li>
            ) : (
              reactionListRows.map((row) => {
                const displayName = viewerLabelForActor(row.name, currentUser, resolvedCurrentEmail);
                const initials = String(displayName || 'U')
                  .replace(/\s+/g, '')
                  .slice(0, 2)
                  .toUpperCase();
                const nameLine = displayName === 'You' ? displayName : `~ ${displayName}`;
                return (
                  <li key={row.key} className="message-reaction-sheet-row">
                    <div className="message-reaction-sheet-avatar" aria-hidden>
                      {row.photo ? (
                        <img src={row.photo} alt="" className="message-reaction-sheet-avatar-img" />
                      ) : (
                        <span className="message-reaction-sheet-avatar-fallback">{initials}</span>
                      )}
                    </div>
                    <div className="message-reaction-sheet-row-text">
                      <div className="message-reaction-sheet-row-name">{nameLine}</div>
                      {row.email ? (
                        <div className="message-reaction-sheet-row-sub">{row.email}</div>
                      ) : null}
                    </div>
                    <span
                      className={`message-reaction-sheet-row-emoji ${displayName === 'You' ? 'message-reaction-sheet-row-emoji--removable' : ''}`}
                      onClick={() => {
                        if (displayName === 'You') {
                          handlePickReaction(row.emoji);
                          setReactionSheet(null);
                        }
                      }}
                      role={displayName === 'You' ? "button" : undefined}
                      title={displayName === 'You' ? "Click to remove" : undefined}
                    >
                      {row.emoji}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>,
      document.body
    );

  return (
    <div
      className={`message ${isOwnMessage ? 'message-own' : 'message-other'}${showContextMenu ? ' message--context-open' : ''}${isActiveSearchResult ? ' message--search-active' : ''}`}
      ref={setOuterRef}
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
      <div
        ref={messageContentRef}
        className={`message-content${Array.isArray(message.reactions) && message.reactions.length > 0 ? ' message-content--with-reaction-summary' : ''}`}
      >
        {renderBubbleColumn(false)}
      </div>
      {contextOverlay}
      {reactionSheetOverlay}
    </div>
  );
};

export default MessageItem;
