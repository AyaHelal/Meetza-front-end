import React, { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeftIcon, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { getVideoSessions, parseSession } from "../services/videoSessionsService";
import { useNavigate } from "react-router-dom";
import "./VideoSessionsHeader.css";

const DEFAULT_THUMB = "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";

export default function VideoSessionsHeader({
  onBack,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  sessions = [], // local sessions for current group (fallback)
  onSubmitSearch,
  isAdmin = false,
  onPostVideoClick,
  groupId = null,
}) {
  const navigate = useNavigate();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // API-based suggestions logic (requires 3+ chars)
  useEffect(() => {
    const q = (searchValue || "").trim();
    
    // Clear suggestions if < 3 chars
    if (q.length < 3) {
      setApiSuggestions([]);
      setIsLoadingSuggestions(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    // Debounce API calls
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    setIsLoadingSuggestions(true);
    debounceTimerRef.current = setTimeout(async () => {
      // Re-verify length inside timeout just in case
      const currentQ = (searchValue || "").trim();
      if (currentQ.length < 3) {
        setApiSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      try {
        const raw = await getVideoSessions(groupId, currentQ);
        const parsed = (raw || []).map(parseSession);
        setApiSuggestions(parsed.slice(0, 10)); // Limit to top 10 results
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        setApiSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchValue, groupId]);

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
    setShowSuggestions(false);
    
    // Navigate to video details page
    if (session.slug) {
      navigate(`/video/${session.slug}`);
    } else if (session.id) {
      navigate(`/video/${session.id}`);
    }
    
    if (onSearchChange) onSearchChange(""); // Clear search after selection if desired
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
      {isAdmin && onPostVideoClick && (
        <button
          type="button"
          className="video-sessions-header-post-video"
          onClick={onPostVideoClick}
          aria-label="Post a video"
        >
          <Plus size={20} weight="bold" />
          <span>Post video</span>
        </button>
      )}
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
        {showSuggestions && (searchValue || "").trim().length >= 3 && (
          <div className="video-sessions-header-suggestions">
            {isLoadingSuggestions ? (
              <p className="video-sessions-header-suggestion-empty">Searching...</p>
            ) : apiSuggestions.length > 0 ? (
              apiSuggestions.map((s) => (
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
