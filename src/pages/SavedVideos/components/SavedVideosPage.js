import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SavedVideosPage.css";
import SavedVideosHeader from "./SavedVideosHeader";
import SavedVideosSidebar from "./SavedVideosSidebar";
import SavedVideosDetail from "./SavedVideosDetail";
import useSavedVideos from "../hooks/useSavedVideos";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../API/axiosInstance";

export default function SavedVideosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupsList, setGroupsList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const userRole = (user?.role || "").toString().trim().toLowerCase();
    const isAdminRole =
      userRole === "administrator" ||
      userRole.includes("super_admin") ||
      userRole.includes("super-admin");
    const endpoint = isAdminRole ? "/group" : "/chat/groups";

    api
      .get(endpoint)
      .then((res) => {
        if (cancelled) return;
        const raw = res?.data?.data ?? res?.data;
        const payload = Array.isArray(raw) ? raw : [];
        const list = payload
          .map((g) => {
            const id = g.id ?? g.group_id ?? g._id;
            const name = g.name ?? g.group_name ?? g.title ?? g.content_name ?? g.group_content_name ?? "—";
            return { id: String(id), name: String(name).trim() };
          })
          .filter((g) => g.id !== "undefined" && g.id !== "null");
        setGroupsList(list);
      })
      .catch(() => {
        if (!cancelled) setGroupsList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const { savedVideos, loading, error, refetch, removeFromSaved, removingId } =
    useSavedVideos(selectedGroupId);

  const groupNameById = useMemo(
    () => Object.fromEntries(groupsList.map((g) => [g.id, g.name])),
    [groupsList],
  );

  const savedVideosWithGroup = useMemo(
    () =>
      savedVideos.map((v) => ({
        ...v,
        groupName:
          v.groupName ??
          v.group_name ??
          (v.group_id != null ? groupNameById[String(v.group_id)] : null) ??
          null,
      })),
    [savedVideos, groupNameById],
  );

  const filtered = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();
    if (q.length < 3) return savedVideosWithGroup;
    return savedVideosWithGroup.filter((v) => {
      const title = (v.title || "").toLowerCase();
      const gn = (v.groupName || "").toLowerCase();
      return title.includes(q) || (gn && gn.includes(q));
    });
  }, [savedVideosWithGroup, searchQuery]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return savedVideosWithGroup.find((v) => String(v.id) === String(selectedId)) || null;
  }, [savedVideosWithGroup, selectedId]);

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
        videos={savedVideosWithGroup}
        onSuggestionSelect={(video) => {
          if (!video?.id) return;
          setSelectedId(video.id);
        }}
        groupsList={groupsList}
        selectedGroupId={selectedGroupId}
        onGroupChange={setSelectedGroupId}
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
                      savedVideos={savedVideosWithGroup}
                      onBack={handleBack}
                      onSelectSession={(video) => handleSelect(video)}
                      onUnsave={async (videoId) => {
                        if (!videoId) return;
                        if (String(videoId) === String(selectedId)) setSelectedId(null);
                        await removeFromSaved?.(videoId);
                      }}
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