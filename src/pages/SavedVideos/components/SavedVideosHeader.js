import React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import "./SavedVideosHeader.css";

export default function SavedVideosHeader({
  title,
  searchValue,
  onSearchChange,
}) {
  return (
    <div className="saved-videos-header">
      <div className="saved-videos-header-left">
        <div className="saved-videos-header-text">
          <h1 className="saved-videos-title fw-semibold">{title}</h1>
        </div>
      </div>

      <div className="saved-videos-search-wrap">
        <MagnifyingGlass size={20} className="saved-videos-search-icon" />
        <input
          type="search"
          className="saved-videos-search"
          placeholder="Search"
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          aria-label="Search saved videos"
        />
      </div>
    </div>
  );
}

