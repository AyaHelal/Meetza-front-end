import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./SavedVideosPage.css";
import SavedVideosHeader from "./SavedVideosHeader";
import SavedVideosSidebar from "./SavedVideosSidebar";
import SavedVideosDetail from "./SavedVideosDetail";
import useSavedVideos from "../hooks/useSavedVideos";

export default function SavedVideosPage() {
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    savedVideos,
    loading,
    error,
    refetch,
    removeFromSaved,
    removingId,
  } = useSavedVideos();

  const filtered = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();
    if (!q) return savedVideos;
    return savedVideos.filter((v) => (v.title || "").toLowerCase().includes(q));
  }, [savedVideos, searchQuery]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return savedVideos.find((v) => String(v.id) === String(selectedId)) || null;
  }, [savedVideos, selectedId]);

  const handleBack = useCallback(() => {
    if (selectedId) {
      setSelectedId(null);
      return;
    }
    navigate("/home", { replace: true });
  }, [navigate, selectedId]);

  const handleSelect = useCallback((video) => {
    setSelectedId(video?.id ?? null);
  }, []);

  return (
    <div className="saved-videos-page">
      <SavedVideosHeader
        title="Saved videos"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        videos={savedVideos}
        onSuggestionSelect={(video) => {
          if (!video?.id) return;
          setSelectedId(video.id);
        }}
      />

      {error && <div className="saved-videos-error">{error}</div>}

      {loading ? (
        <div className="saved-videos-loading">Loading saved videos…</div>
      ) : (
        <div className="saved-videos-layout container-fluid row g-3">
          <div className="saved-videos-left col-12 col-lg-4">
            <SavedVideosSidebar
              videos={filtered}
              selectedId={selectedId}
              onSelect={handleSelect}
              onRemove={async (video) => {
                const id = video?.id;
                if (!id) return;
                if (String(id) === String(selectedId)) setSelectedId(null);
                await removeFromSaved?.(id);
              }}
              removingId={removingId}
            />
          </div>

          <div className="saved-videos-right col-12 col-lg-8">
            {selected ? (
              <div className="saved-videos-selected-state">
                <div className="saved-videos-selected-card">
                  <div className="saved-videos-empty-card-header">
                    <span className="saved-videos-empty-card-title">Quick Time</span>
                    <button
                      type="button"
                      className="saved-videos-empty-card-action-btn"
                      onClick={() => setSelectedId(null)}
                    >
                      Delete Selection
                    </button>
                  </div>
                  <div className="saved-videos-selected-body">
                    <SavedVideosDetail
                      session={selected}
                      savedVideos={savedVideos}
                      onBack={handleBack}
                      onSelectSession={(video) => handleSelect(video)}
                      onVideoDeleted={() => {
                        setSelectedId(null);
                        refetch?.();
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="saved-videos-empty-state">
                <div className="saved-videos-empty-card">
                  <div className="saved-videos-empty-card-header">
                    <span className="saved-videos-empty-card-title">Quick Time</span>
                    <span className="saved-videos-empty-card-action">Delete Selection</span>
                  </div>
                  <div className="saved-videos-empty-body">
                    <img
                      src="/assets/GroupChat.png"
                      alt="No selection"
                      className="saved-videos-empty-graphic"
                    />
                    <p className="saved-videos-empty-heading">
                      {filtered.length === 0 ? "No saved videos" : "No Selection Yet!"}
                    </p>
                    {filtered.length === 0 && (
                      <p className="saved-videos-empty-subtext">
                        Save videos to see them here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}