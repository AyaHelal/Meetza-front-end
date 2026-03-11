import React, { createContext, useContext, useReducer } from "react";

const initialState = {
  sessions: [],
  searchQuery: "",
  loading: false,
  error: null,
};

function videoSessionsReducer(state, action) {
  switch (action.type) {
    case "SET_SESSIONS":
      return { ...state, sessions: action.payload, loading: false, error: null };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

const VideoSessionsContext = createContext(null);

export function VideoSessionsProvider({ children }) {
  const [state, dispatch] = useReducer(videoSessionsReducer, initialState);
  return (
    <VideoSessionsContext.Provider value={{ state, dispatch }}>
      {children}
    </VideoSessionsContext.Provider>
  );
}

export function useVideoSessionsStore() {
  const ctx = useContext(VideoSessionsContext);
  if (!ctx) throw new Error("useVideoSessionsStore must be used within VideoSessionsProvider");
  return ctx;
}
