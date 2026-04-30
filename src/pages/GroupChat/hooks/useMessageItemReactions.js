import { useState, useCallback, useEffect } from 'react';

export function useMessageItemReactions({ messageId, reactionPillRef }) {
  /** `{ filter: 'all' | emoji, anchor: DOMRect }` when open */
  const [reactionSheet, setReactionSheet] = useState(null);

  const readReactionPillRect = useCallback(() => {
    const el = reactionPillRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, [reactionPillRef]);

  const toggleReactionSheet = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setReactionSheet((prev) => (prev ? null : { filter: 'all', anchor: readReactionPillRect() }));
  }, [readReactionPillRect]);

  const closeReactionSheet = useCallback(() => {
    setReactionSheet(null);
  }, []);

  const setReactionFilter = useCallback((filter) => {
    setReactionSheet((prev) => (prev ? { ...prev, filter } : null));
  }, []);

  useEffect(() => {
    closeReactionSheet();
  }, [messageId, closeReactionSheet]);

  useEffect(() => {
    if (!reactionSheet) return;
    const onPointerDown = (e) => {
      const t = e.target;
      if (typeof t.closest === 'function' && t.closest('.message-reaction-sheet-panel')) return;
      if (typeof t.closest === 'function' && t.closest('.message-reaction-summary-pill')) return;
      closeReactionSheet();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [reactionSheet, closeReactionSheet]);

  return {
    reactionSheet,
    setReactionSheet,
    toggleReactionSheet,
    closeReactionSheet,
    setReactionFilter,
  };
}
