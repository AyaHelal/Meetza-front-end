import React, { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import "./SavedVideosHeader.css";
import { DEFAULT_THUMB } from "./constants";

export default function SavedVideosHeader({
  title,
  searchValue,
  onSearchChange,
  videos = [],
  onSuggestionSelect,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!searchValue || !searchValue.trim()) return [];
    const q = searchValue.toLowerCase().trim();
    return (videos || []).filter((v) => (v.title || "").toLowerCase().includes(q)).slice(0, 5);
  }, [videos, searchValue]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (video) => {
    const titleValue = video?.title || "";
    if (onSearchChange) onSearchChange(titleValue);
    setShowSuggestions(false);
    if (onSuggestionSelect) onSuggestionSelect(video);
  };

  return (
    <div className="saved-videos-header">
      <div className="saved-videos-header-left">
        <div className="saved-videos-header-text">
          <h1 className="saved-videos-title fw-semibold">{title}</h1>
        </div>
      </div>

      <div className="saved-videos-search-wrap" ref={containerRef}>
        <MagnifyingGlass size={20} className="saved-videos-search-icon" />
        <input
          type="search"
          className="saved-videos-search"
          placeholder="Search"
          value={searchValue ?? ""}
          onChange={(e) => {
            onSearchChange?.(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (searchValue?.trim()) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search saved videos"
        />

        {showSuggestions && searchValue?.trim() && (
          <div className="saved-videos-header-suggestions">
            {suggestions.length > 0 ? (
              suggestions.map((v) => (
                <button
                  key={v.id ?? v.title}
                  className="saved-videos-header-suggestion-item"
                  onClick={() => handleSuggestionClick(v)}
                  type="button"
                >
                  <img
                    src={v.thumbnailUrl || v.poster_url || v.thumbnailUrl || DEFAULT_THUMB}
                    alt={v.title}
                    className="saved-videos-header-suggestion-thumb"
                  />
                  <div className="saved-videos-header-suggestion-text">
                    <h4 className="saved-videos-header-suggestion-title">{v.title || "Video"}</h4>
                  </div>
                </button>
              ))
            ) : (
              <p className="saved-videos-header-suggestion-empty">No matching videos</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

