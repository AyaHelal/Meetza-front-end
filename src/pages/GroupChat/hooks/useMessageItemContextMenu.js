import { useState, useRef, useCallback, useEffect } from 'react';

const LONG_PRESS_MS = 520;

export function useMessageItemContextMenu({ canOpenSheet, messageContentRef }) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const longPressTimerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

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
  }, [messageContentRef]);

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

  // Keep anchorRect in sync with scrolling/resizing
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
  }, [showContextMenu, closeContextSheet, messageContentRef]);

  // Escape key to close
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && showContextMenu) closeContextSheet();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showContextMenu, closeContextSheet]);

  return {
    showContextMenu,
    anchorRect,
    showEmojiPicker,
    setShowEmojiPicker,
    handleRightClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    closeContextSheet,
    openContextSheet,
  };
}
