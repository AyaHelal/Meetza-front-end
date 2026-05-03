import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getUserTheme, updateUserTheme } from '../services/themeService';
import { getStoredTheme, saveTheme } from '../utils/themeStorage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user, setUser } = useAuth();

  const [theme, setThemeState] = useState(() => {
    return getStoredTheme() || 'light';
  });

  const lastUserId = useRef(null);
  // Track if we had a local preference on mount to decide if we need to sync from server
  const initialThemeCheck = useRef(getStoredTheme());

  // 1. Sync theme from backend once per user login if no local preference exists
  useEffect(() => {
    const fetchTheme = async () => {
      if (!user?.id) return;

      // Only sync from server if we haven't already saved a preference for this user
      // or if we just logged in as a different user
      if (lastUserId.current !== user.id) {
        lastUserId.current = user.id;

        if (!initialThemeCheck.current) {
          try {
            const serverTheme = await getUserTheme(user.id);
            if (serverTheme && (serverTheme === 'light' || serverTheme === 'dark')) {
              setThemeState(serverTheme);
              saveTheme(serverTheme);
              // Update ref so we don't re-sync unnecessarily
              initialThemeCheck.current = serverTheme;
            }
          } catch (e) {
            console.warn("Failed to fetch server theme, falling back to local/default");
          }
        }
      }
    };

    fetchTheme();
  }, [user?.id]);

  // 2. Apply theme to DOM and persist to localStorage
  useEffect(() => {
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
        const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
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