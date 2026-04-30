import React, { useMemo, useCallback } from 'react';

export function useMessageItemSearchHighlight({ searchWord, isSearchMatch }) {
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

  return {
    renderHighlighted,
    shouldHighlight,
  };
}
