import React from "react";
import { CaretLeft, MagnifyingGlass, ArrowLeftIcon } from "@phosphor-icons/react";
import "./VideoSessionsHeader.css";

export default function VideoSessionsHeader({
  onBack,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
}) {
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
      <div className="video-sessions-header-search-wrap">
        <MagnifyingGlass size={20} className="video-sessions-header-search-icon" />
        <input
          type="search"
          className="video-sessions-header-search"
          placeholder={searchPlaceholder}
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          aria-label="Search video sessions"
        />
      </div>
    </header>
  );
}
