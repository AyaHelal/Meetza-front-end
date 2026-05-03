import { useRef, useEffect } from "react";

const MIN_SWIPE_DISTANCE = 60;
const MAX_VERTICAL_MOVEMENT = 100;

/**
 * Attaches swipe-back (right) touch handlers to mainChatRef on mobile.
 * Requires mainChatRef, isMobile, showMainChat, onBackToChats, onCloseSection, activeSection.
 */
export function useMainChatSwipeBack({
  mainChatRef,
  isMobile,
  showMainChat,
  onBackToChats,
  onCloseSection,
  activeSection,
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!isMobile || !showMainChat || !mainChatRef?.current) return;
    if (!onBackToChats && !onCloseSection) return;

    const mainChat = mainChatRef.current;

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!touchStartX.current || !touchStartY.current || e.touches.length !== 1) return;
      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const diffX = touchCurrentX - touchStartX.current;
      const diffY = touchCurrentY - touchStartY.current;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);
      if (diffX > 20 && absDiffX > absDiffY && absDiffY < MAX_VERTICAL_MOVEMENT && absDiffX > 30) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (!touchStartX.current || !touchStartY.current) {
        touchStartX.current = 0;
        touchStartY.current = 0;
        return;
      }
      const touchEndX = e.changedTouches[0]?.clientX || 0;
      const touchEndY = e.changedTouches[0]?.clientY || 0;
      const diffX = touchEndX - touchStartX.current;
      const diffY = touchEndY - touchStartY.current;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);
      if (diffX > MIN_SWIPE_DISTANCE && absDiffX > absDiffY && absDiffY < MAX_VERTICAL_MOVEMENT) {
        if (activeSection && onCloseSection) onCloseSection();
        else if (onBackToChats) onBackToChats();
      }
      touchStartX.current = 0;
      touchStartY.current = 0;
    };

    mainChat.addEventListener("touchstart", handleTouchStart, { passive: true });
    mainChat.addEventListener("touchmove", handleTouchMove, { passive: false });
    mainChat.addEventListener("touchend", handleTouchEnd, { passive: true });
    mainChat.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      mainChat.removeEventListener("touchstart", handleTouchStart);
      mainChat.removeEventListener("touchmove", handleTouchMove);
      mainChat.removeEventListener("touchend", handleTouchEnd);
      mainChat.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [mainChatRef, isMobile, showMainChat, onBackToChats, onCloseSection, activeSection]);
}
