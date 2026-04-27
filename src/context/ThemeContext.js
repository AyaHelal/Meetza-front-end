import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { updateUser } from '../API/user';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user, setUser } = useAuth();
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'light';
  });

  const lastUserId = useRef(null);

  // 1. Sync theme FROM user object on login/user change
  //    localStorage is the source of truth — user.theme only used as fallback
  useEffect(() => {
    if (user && user.id) {
      if (lastUserId.current !== user.id) {
        lastUserId.current = user.id;

        const localTheme = localStorage.getItem('app-theme');

        if (!localTheme && user.theme && (user.theme === 'light' || user.theme === 'dark')) {
          // No local preference saved yet → use backend theme
          setThemeState(user.theme);
        }
        // If localTheme exists, it wins — don't override with token/user data
      }
    } else {
      lastUserId.current = null;
    }
  }, [user]);

  // 2. Apply theme to DOM and localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 3. Update theme locally and persist to backend + storage
  const setTheme = async (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') return;

    // Update state and localStorage immediately (optimistic)
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);

    if (user && user.id) {
      try {
        await updateUser(user.id, { theme: newTheme });

        // Keep user object in sync so the useEffect above doesn't fight us
        setUser((prev) => ({ ...prev, theme: newTheme }));

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
        console.error('❌ Failed to persist theme to backend:', error);
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
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