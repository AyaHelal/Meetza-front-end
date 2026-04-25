import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { updateUser } from '../API/user';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  // Track if we've already synced the theme from the current user token to avoid loops
  const lastUserId = useRef(null);

  // 1. Sync theme FROM user token/object when it changes (e.g. on login)
  useEffect(() => {
    if (user && user.id) {
      // Only sync if the user has changed or it's the first load for this user
      if (lastUserId.current !== user.id) {
        lastUserId.current = user.id;
        if (user.theme && user.theme !== theme) {
          setThemeState(user.theme);
        }
      }
    } else {
      lastUserId.current = null;
    }
  }, [user]);

  // 2. Apply theme to document and localStorage
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 3. Update theme locally and on backend
  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    
    // If user is logged in, persist to backend
    if (user && user.id) {
      try {
        await updateUser(user.id, { theme: newTheme });
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
