import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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

function viewerLabelForActor(actor, currentUser, currentUserEmail) {
  const a = String(actor || '').trim();
  if (!a) return a;
  const emails = [currentUserEmail, currentUser?.email, currentUser?.user_email].filter(Boolean);
  for (const em of emails) {
    const norm = em.trim().toLowerCase();
    if (!norm) continue;
    const local = norm.split('@')[0] || '';
    if (a.toLowerCase() === norm || (local && a.toLowerCase() === local)) return 'You';
  }
  const nm = currentUser?.name?.trim();
  if (nm && a.toLowerCase() === nm.toLowerCase()) return 'You';
  return a;
}

function totalReactionCount(reactions) {
  if (!Array.isArray(reactions)) return 0;
  return reactions.reduce((sum, r) => sum + Math.max(1, Number(r.count) || 1), 0);
}

/** @param {string} filterEmoji `'all'` or one emoji string */
function reactionSheetRows(reactions, filterEmoji) {
  const rows = [];
  for (const r of reactions || []) {
    if (filterEmoji !== 'all' && r.emoji !== filterEmoji) continue;
    const reactors = Array.isArray(r.reactors) ? r.reactors : [];
    const em = r.emoji;
    if (reactors.length > 0) {
      reactors.forEach((rec, idx) => {
        rows.push({
          key: `${em}-${rec.id}-${idx}`,
          name: rec.name,
          email: rec.email,
          photo: rec.photo,
          emoji: rec.emoji || em,
        });
      });
    } else {
      (r.actors || []).forEach((name, idx) => {
        rows.push({
          key: `${em}-a-${idx}`,
          name,
          email: '',
          photo: null,
          emoji: em,
        });
      });
    }
  }
  return rows.sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
  );
}

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
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message || message.text || '');
  /** `{ filter: 'all' | emoji }` when open */
  const [reactionSheet, setReactionSheet] = useState(null);

  const isLinkMessage = message.message && /^https?:\/\/\S+$/i.test(message.message.trim());
  const finalMedia =
    message.media?.length > 0
      ? message.media
      : isLinkMessage
        ? [{ media_type: 'link', media_url: message.message }]
        : [];

  const displayText = getDisplayText(message, finalMedia);

  const highlightNeedle = useMemo(() => String(searchWord || '').trim(), [searchWord]);
  const shouldHighlight = Boolean(highlightNeedle) && Boolean(isSearchMatch);

  const renderHighlighted = useCallback(
    (text) => {
      const raw = String(text || '');
      if (!shouldHighlight || !raw) return raw;
      const needle = highlightNeedle;
      if (!needle) return raw;
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(${escaped})`, 'ig');
      const parts = raw.split(re);
      return parts.map((part, i) => {
        const isHit = i % 2 === 1 && part;
        if (!isHit) return <React.Fragment key={i}>{part}</React.Fragment>;
        return (
          <mark key={i} className="chat-search-highlight">
            {part}
          </mark>
        );
      });
    },
    [shouldHighlight, highlightNeedle]
  );

  useEffect(() => {
    setEditText(message.message || message.text || '');
  }, [message.message, message.text]);

  const messageRef = useRef(null);
  /** Bubble column only (max-width ~70%); used so the highlight matches real size, not full chat row. */
  const messageContentRef = useRef(null);
  const reactionPillRef = useRef(null);
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
    setReactionSheet(null);
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
      else if (showContextMenu) closeContextSheet();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showContextMenu, closeContextSheet, reactionSheet]);

  useEffect(() => {
    if (!reactionSheet) return;
    const onPointerDown = (e) => {
      const t = e.target;
      if (typeof t.closest === 'function' && t.closest('.message-reaction-sheet-panel')) return;
      if (typeof t.closest === 'function' && t.closest('.message-reaction-summary-pill')) return;
      setReactionSheet(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [reactionSheet]);

  useEffect(() => {
    setReactionSheet(null);
  }, [message.id]);

  const readReactionPillRect = useCallback(() => {
    const el = reactionPillRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, []);

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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setReactionSheet((prev) => (prev ? null : { filter: 'all', anchor: readReactionPillRect() }));
          }}
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

  const reactionListRows = reactionSheet
    ? reactionSheetRows(message.reactions, reactionSheet.filter)
    : [];
  const reactionSheetTotal = totalReactionCount(message.reactions);

  const reactionPopoverLayout = (() => {
    if (!reactionSheet?.anchor) return null;
    const a = reactionSheet.anchor;
    const gap = 10;
    const pad = 12;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
    const maxW = Math.min(560, vw - pad * 2);
    const maxH = Math.min(520, vh - pad * 2);

    const preferLeft = isOwnMessage;
    const leftCandidate = a.right + gap;

    const placeOnLeft = preferLeft ? true : leftCandidate + maxW > vw - pad;
    const left = placeOnLeft ? Math.max(pad, a.left - gap - maxW) : Math.min(vw - pad - maxW, leftCandidate);

    const topIdeal = a.top - 8;
    const top = Math.max(pad, Math.min(vh - pad - maxH, topIdeal));
    return { left, top, maxW, maxH };
  })();

  useEffect(() => {
    if (!reactionSheet) return;
    const tick = () => {
      const r = readReactionPillRect();
      if (!r?.width) return;
      setReactionSheet((prev) => (prev ? { ...prev, anchor: r } : prev));
    };
    tick();
    const scrollOpts = { capture: true, passive: true };
    const onScrollOrResize = () => requestAnimationFrame(tick);
    window.addEventListener('scroll', onScrollOrResize, scrollOpts);
    document.addEventListener('scroll', onScrollOrResize, scrollOpts);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, scrollOpts);
      document.removeEventListener('scroll', onScrollOrResize, scrollOpts);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [reactionSheet, readReactionPillRect]);

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
                  position: 'fixed',
                  left: reactionPopoverLayout.left,
                  top: reactionPopoverLayout.top,
                  width: reactionPopoverLayout.maxW,
                  maxHeight: reactionPopoverLayout.maxH,
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
                    <span className="message-reaction-sheet-row-emoji" aria-hidden>
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
