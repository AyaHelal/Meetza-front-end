import React, { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeftIcon, MagnifyingGlass } from "@phosphor-icons/react";
import "./VideoSessionsHeader.css";

const DEFAULT_THUMB = "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";

export default function VideoSessionsHeader({
  onBack,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  sessions = [],
  onSubmitSearch,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  // Filter sessions based on search value for suggestions
  const suggestions = useMemo(() => {
    if (!searchValue || !searchValue.trim()) return [];
    const q = searchValue.toLowerCase().trim();
    return sessions.filter((s) => (s.title || "").toLowerCase().includes(q)).slice(0, 5); // limit to top 5
  }, [sessions, searchValue]);

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
      if (onSubmitSearch) onSubmitSearch(searchValue);
    }
  };

  const handleSuggestionClick = (session) => {
    const title = session.title || "";
    if (onSearchChange) onSearchChange(title);
    setShowSuggestions(false);
    if (onSubmitSearch) onSubmitSearch(title);
  };

  return (
    <header className="video-sessions-header">
      <div className="video-sessions-header-back-and-text">
        <button
          type="button"
          className="video-sessions-header-back"
          onClick={onBack}
          aria-label="Back to group chat"
        >
          <ArrowLeftIcon size={24} />
        </button>
        <div className="video-sessions-header-text">
          <h1 className="video-sessions-header-title">Video sessions</h1>
          <p className="video-sessions-header-subtitle">
            All of your video sessions is here.
          </p>
        </div>
      </div>
      <div className="video-sessions-header-search-wrap" ref={containerRef}>
        <MagnifyingGlass size={20} className="video-sessions-header-search-icon" />
        <input
          type="search"
          className="video-sessions-header-search"
          placeholder={searchPlaceholder}
          value={searchValue ?? ""}
          onChange={(e) => {
            if (onSearchChange) onSearchChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (searchValue?.trim()) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search video sessions"
        />
        {showSuggestions && searchValue?.trim() && (
          <div className="video-sessions-header-suggestions">
            {suggestions.length > 0 ? (
              suggestions.map((s) => (
                <button
                  key={s.id ?? s.title}
                  className="video-sessions-header-suggestion-item"
                  onClick={() => handleSuggestionClick(s)}
                  type="button"
                >
                  <img
                    src={s.poster_url || s.thumbnailUrl || DEFAULT_THUMB}
                    alt={s.title}
                    className="video-sessions-header-suggestion-thumb"
                  />
                  <div className="video-sessions-header-suggestion-text">
                    <h4 className="video-sessions-header-suggestion-title">
                      {s.title || "Video"}
                    </h4>
                  </div>
                </button>
              ))
            ) : (
              <p className="video-sessions-header-suggestion-empty">No matching videos</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
