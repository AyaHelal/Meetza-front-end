import api from '../API/axiosInstance';

/**
 * Fetches the current user's theme preference from the server.
 * @param {string|number} userId 
 * @returns {Promise<string|null>}
 */
export const getUserTheme = async (userId) => {
  const res = await api.get(`/user/${userId}`);
  const user = res.data?.data || res.data;
  return user?.theme;
};

/**
 * Updates the user's theme preference on the server.
 * @param {string|number} userId 
 * @param {string} theme 
 * @returns {Promise<Object>}
 */
export const updateUserTheme = async (userId, theme) => {
  return api.patch(`/user/${userId}`, { theme });
};
