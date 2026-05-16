import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getUserTheme, updateUserTheme } from '../services/themeService';
import { getStoredTheme, saveTheme } from '../utils/themeStorage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user, setUser, initializing } = useAuth();

  const [theme, setThemeState] = useState(() => {
    // 1. Try to get theme from stored user first (most reliable for logged in users)
    try {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.theme && (parsed.theme === 'light' || parsed.theme === 'dark')) {
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', parsed.theme);
          }
          return parsed.theme;
        }
      }
    } catch (e) { }

    // 2. Fallback to generic stored theme
    const stored = getStoredTheme() || 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', stored);
    }
    return stored;
  });

  const lastUserId = useRef(null);
  // Track if we had a local preference on mount to decide if we need to sync from server
  const initialThemeCheck = useRef(getStoredTheme());

  // 1. Sync theme from backend once per browser tab session
  useEffect(() => {
    const fetchTheme = async () => {
      if (initializing) return;

      if (!user?.id) {
        lastUserId.current = null;
        initialThemeCheck.current = null;
        if (!getStoredTheme()) setThemeState('light');
        return;
      }

      const sessionSyncKey = `theme_synced_${user.id}`;
      const isSyncedInSession = sessionStorage.getItem(sessionSyncKey);

      // 1. Sync from user object - ONLY if we don't have a strong local preference already
      // This prevents the stale theme inside the JWT token from overwriting our fresh choice on refresh
      if (user.theme && (user.theme === 'light' || user.theme === 'dark')) {
        const hasLocalPreference = !!initialThemeCheck.current;
        if (!hasLocalPreference && theme !== user.theme) {
          setThemeState(user.theme);
          saveTheme(user.theme);
        }
      }

      // 2. Sync from server once per session (Cloud truth)
      if (lastUserId.current !== user.id || !isSyncedInSession) {
        lastUserId.current = user.id;

        try {
          const serverTheme = await getUserTheme(user.id);
          if (serverTheme && (serverTheme === 'light' || serverTheme === 'dark')) {
            // Only overwrite if it's different from what we have
            if (theme !== serverTheme) {
              setThemeState(serverTheme);
              saveTheme(serverTheme);
            }
          }
          sessionStorage.setItem(sessionSyncKey, 'true');
        } catch (e) {
          console.warn("Failed to fetch server theme, falling back to local/default");
          sessionStorage.setItem(sessionSyncKey, 'true');
        }
      }
    };

    fetchTheme();
  }, [user?.id, initializing, user?.theme, theme]); // Added theme to dependencies

  // 2. Apply theme to DOM and persist to localStorage
  useLayoutEffect(() => {
    saveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 3. Update theme locally and persist to backend
  const setTheme = async (newTheme) => {
    if (!['light', 'dark'].includes(newTheme)) return;

    // Optimistic update
    setThemeState(newTheme);
    saveTheme(newTheme);

    if (user?.id) {
      // 1. Update user context immediately (Optimistic)
      if (setUser) {
        setUser((prev) => (prev ? { ...prev, theme: newTheme } : prev));
      }

      // 2. Update whichever storage holds the user object immediately (Optimistic)
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      const raw = storage.getItem('user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          storage.setItem('user', JSON.stringify({ ...parsed, theme: newTheme }));
        } catch (_) { }
      }
      
      // 3. Mark as synced for this session so we don't fetch stale data from server
      sessionStorage.setItem(`theme_synced_${user.id}`, 'true');

      // 4. Finally, persist to backend
      try {
        await updateUserTheme(user.id, newTheme);
      } catch (error) {
        console.error("❌ Failed to persist theme to backend:", error);
        // Note: We don't revert optimistic state here to keep the UI smooth, 
        // it will try to sync again on next session/login.
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};