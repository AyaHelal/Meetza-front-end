import React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function ChatsPanelToolbar({
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
}) {
  return (
    <>
      <div className="chats-header">
        <h2 className="fw-semibold">Group Chats</h2>
      </div>
      <div className="chats-search">
        <MagnifyingGlass size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="chats-tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          className={`tab ${activeTab === "unread" ? "active" : ""}`}
          onClick={() => setActiveTab("unread")}
        >
          Unread
        </button>
      </div>
    </>
  );
}
