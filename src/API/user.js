import api from "./axiosInstance";

/**
 * Update user data
 * @param {string} id User ID
 * @param {object} data Data to update (e.g. { theme: 'dark' })
 */
export const updateUser = async (id, data) => {
  try {
    const response = await api.patch(`/user/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating user:", error);
    throw error;
  }
};
