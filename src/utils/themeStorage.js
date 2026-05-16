/**
 * Retrieves the saved theme from localStorage.
 * Validates that it is either 'light' or 'dark'.
 * @returns {string|null}
 */
export const getStoredTheme = () => {
  const saved = localStorage.getItem('app-theme');
  return saved === 'light' || saved === 'dark' ? saved : null;
};

/**
 * Saves the theme preference to localStorage.
 * @param {string} theme 
 */
export const saveTheme = (theme) => {
  localStorage.setItem('app-theme', theme);
};

/**
 * Removes the theme preference from localStorage.
 */
export const clearStoredTheme = () => {
  localStorage.removeItem('app-theme');
};
