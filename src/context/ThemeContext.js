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

  // 1. Sync theme from backend once per user login
  useEffect(() => {
    const fetchTheme = async () => {
      if (initializing) return;

      if (!user?.id) {
        lastUserId.current = null;
        initialThemeCheck.current = null;
        // Don't force 'light' immediately if we already have a theme, 
        // but if no user, light is the safe default for guests
        if (!getStoredTheme()) setThemeState('light');
        return;
      }

      // If the user object already has a theme, apply it immediately (no 1s delay)
      if (user.theme && (user.theme === 'light' || user.theme === 'dark')) {
        if (theme !== user.theme) {
          setThemeState(user.theme);
          saveTheme(user.theme);
        }
      }

      // Only sync from server if we just logged in as a different user
      if (lastUserId.current !== user.id) {
        lastUserId.current = user.id;

        try {
          const serverTheme = await getUserTheme(user.id);
          if (serverTheme && (serverTheme === 'light' || serverTheme === 'dark')) {
            if (theme !== serverTheme) {
              setThemeState(serverTheme);
              saveTheme(serverTheme);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch server theme, falling back to local/default");
        }
      }
    };

    fetchTheme();
  }, [user?.id, initializing, user?.theme]);

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
      try {
        await updateUserTheme(user.id, newTheme);
        // Update user context to keep theme property in sync
        if (setUser) {
          setUser((prev) => (prev ? { ...prev, theme: newTheme } : prev));
        }

        // Update whichever storage holds the user object
        const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
        const raw = storage.getItem('user');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            storage.setItem('user', JSON.stringify({ ...parsed, theme: newTheme }));
          } catch (_) { }
        }
      } catch (error) {
        console.error("❌ Failed to persist theme to backend:", error);
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