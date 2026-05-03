import { useCallback, useEffect, useRef, useState } from "react";

function listBoundsKey(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((x) => x?.key ?? x?.id ?? "").join("|");
}

/**
 * Horizontal overflow track + prev/next scroll step (shared by Home stats & meetings sliders).
 * @param {string} slideSelector - CSS selector for one slide (e.g. '.home-stats-slider-slide')
 * @param {Array} list - items rendered in the track (used to refresh bounds when data changes)
 */
export function useHorizontalCardSlider(slideSelector, list = []) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  /** True when row content is wider than the visible track (horizontal scroll needed). */
  const [hasOverflow, setHasOverflow] = useState(false);

  const boundsKey = listBoundsKey(list);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    const eps = 4;
    setHasOverflow(scrollWidth > clientWidth + eps);
    setCanPrev(scrollLeft > eps);
    setCanNext(scrollLeft < max - eps);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    const onWinResize = () => updateScrollState();
    window.addEventListener("resize", onWinResize);
    const mo = new MutationObserver(() => {
      requestAnimationFrame(updateScrollState);
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, [updateScrollState, slideSelector, boundsKey]);

  const scrollByDirection = useCallback(
    (dir) => {
      const el = trackRef.current;
      if (!el) return;
      const slide = el.querySelector(slideSelector);
      const styles = slide ? window.getComputedStyle(el) : null;
      const gap = styles ? parseFloat(styles.columnGap || styles.gap || "12") || 12 : 12;
      const step = slide ? slide.getBoundingClientRect().width + gap : el.clientWidth * 0.4;
      el.scrollBy({ left: dir * step, behavior: "smooth" });
      window.requestAnimationFrame(() => {
        setTimeout(updateScrollState, 350);
      });
    },
    [slideSelector, updateScrollState]
  );

  return { trackRef, canPrev, canNext, hasOverflow, updateScrollState, scrollByDirection };
}
