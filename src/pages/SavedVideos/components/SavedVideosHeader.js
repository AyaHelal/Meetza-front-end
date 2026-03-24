import React, { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, Funnel, Check } from "@phosphor-icons/react";
import { getSavedVideos } from "../services/savedVideosService";
import "./SavedVideosHeader.css";
import { DEFAULT_THUMB } from "./constants";

export default function SavedVideosHeader({
  title,
  searchValue,
  onSearchChange,
  videos = [],
  onSuggestionSelect,
  groupsList = [],
  selectedGroupId,
  onGroupChange,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const containerRef = useRef(null);
  const filterRef = useRef(null);
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
      // Re-verify length inside timeout
      const currentQ = (searchValue || "").trim();
      if (currentQ.length < 3) {
        setApiSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      try {
        const results = await getSavedVideos(selectedGroupId, currentQ);
        setApiSuggestions(results.slice(0, 10));
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
  }, [searchValue, selectedGroupId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
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
    setShowSuggestions(false);
    if (onSuggestionSelect) onSuggestionSelect(video);
  };

  const selectedGroupName = selectedGroupId ? groupsList.find((g) => g.id === selectedGroupId)?.name : null;

  return (
    <div className="saved-videos-header">
      <div className="saved-videos-header-left">
        <div className="saved-videos-header-text">
          <h1 className="saved-videos-title fw-semibold">{title}</h1>
        </div>
      </div>

      <div className="saved-videos-header-actions">
        <div className="saved-videos-filter-dropdown" ref={filterRef}>
          <button
            type="button"
            className={`saved-videos-filter-btn ${filterOpen ? "open" : ""}`}
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            aria-haspopup="listbox"
          >
            <Funnel size={18} weight={selectedGroupId ? "fill" : "bold"} />
            <span className="saved-videos-filter-btn-text">
              {selectedGroupName || "Filter"}
            </span>
          </button>
          {filterOpen && (
            <ul className="saved-videos-filter-list" role="listbox">
              <li
                role="option"
                aria-selected={!selectedGroupId}
                className={`saved-videos-filter-item ${!selectedGroupId ? "selected" : ""}`}
                onClick={() => {
                  onGroupChange?.(null);
                  setFilterOpen(false);
                }}
              >
                <span className="saved-videos-filter-check">
                  {!selectedGroupId && <Check size={14} weight="bold" />}
                </span>
                <span>All groups</span>
              </li>
              {groupsList.map((g) => (
                <li
                  key={g.id}
                  role="option"
                  aria-selected={selectedGroupId === g.id}
                  className={`saved-videos-filter-item ${selectedGroupId === g.id ? "selected" : ""}`}
                  onClick={() => {
                    onGroupChange?.(g.id);
                    setFilterOpen(false);
                  }}
                >
                  <span className="saved-videos-filter-check">
                    {selectedGroupId === g.id && <Check size={14} weight="bold" />}
                  </span>
                  <span>{g.name}</span>
                </li>
              ))}
            </ul>
          )}
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

          {showSuggestions && (searchValue || "").trim().length >= 3 && (
            <div className="saved-videos-header-suggestions">
              {isLoadingSuggestions ? (
                <p className="saved-videos-header-suggestion-empty">Searching...</p>
              ) : apiSuggestions.length > 0 ? (
                apiSuggestions.map((v) => (
                  <button
                    key={v.id ?? v.title}
                    className="saved-videos-header-suggestion-item"
                    onClick={() => handleSuggestionClick(v)}
                    type="button"
                  >
                    <img
                      src={v.thumbnailUrl || v.poster_url || DEFAULT_THUMB}
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
    </div>
  );
}

