import { useEffect, useCallback } from "react";
import { useVideoSessionsStore } from "../store/videoSessionsStore";
import { getVideoSessions, parseSession } from "../services/videoSessionsService";

function getPlaceholderSessions() {
  return [
    { id: "1", title: "Video Title", description: "Video Description", duration: "24:22" },
    { id: "2", title: "Video Title", description: "Video Description", duration: "24:22" },
    { id: "3", title: "Video Title", description: "Video Description", duration: "24:22" },
  ];
}

/**
 * Fetch video sessions and sync with store. Optionally pass groupId from group chat.
 */
export function useVideoSessions(groupId = null) {
  const { state, dispatch } = useVideoSessionsStore();

  const fetchSessions = useCallback(async () => {
    const normalizedGroupId = groupId?.toString?.().trim?.();
    if (!normalizedGroupId) {
      dispatch({ type: "SET_SESSIONS", payload: [] });
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const raw = await getVideoSessions(normalizedGroupId);
      const sessions = (raw || []).map(parseSession);
      // If the API returns no sessions, keep it empty and show no-data state.
      dispatch({ type: "SET_SESSIONS", payload: sessions });
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (err) {
      dispatch({ type: "SET_SESSIONS", payload: [] });
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_ERROR", payload: err?.message || "Failed to load video sessions" });
    }
  }, [groupId, dispatch]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const setSearchQuery = useCallback(
    (query) => dispatch({ type: "SET_SEARCH", payload: query ?? "" }),
    [dispatch]
  );

  const setSelectedSession = useCallback(
    (session) => dispatch({ type: "SET_SELECTED_SESSION", payload: session ?? null }),
    [dispatch]
  );

  const filteredSessions = (state.sessions || []).filter((s) => {
    const q = (state.searchQuery || "").toLowerCase().trim();
    if (q.length < 3) return true; // Don't filter unless 3+ chars
    return (s.title || "").toLowerCase().includes(q);
  });

  return {
    sessions: filteredSessions,
    allSessions: state.sessions,
    loading: state.loading,
    error: state.error,
    searchQuery: state.searchQuery,
    setSearchQuery,
    selectedSession: state.selectedSession,
    setSelectedSession,
    refetch: fetchSessions,
  };
}
