import api from "../API/axiosInstance";

/**
 * Pick the user data payload from a response object.
 */
const pickUserFromResponse = (res) => {
  const root = res?.data;
  const payload = root?.data ?? root?.user ?? root;
  return payload && typeof payload === "object" ? payload : null;
};

/**
 * Map raw user rows to consistent { id, name, email } objects.
 */
const mapRowsToAdministrators = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((u) => ({
      id: u.id ?? u.user_id ?? u.userId,
      name: (u.name ?? u.full_name ?? u.username ?? u.email ?? '').toString().trim(),
      email: (u.email ?? '').toString().trim(),
    }))
    .filter((u) => u.id != null);
};

/**
 * GET /user/:id - fetch a single user by ID.
 */
export const getUserById = async (userId) => {
  if (userId == null || String(userId).trim() === "") {
    throw new Error("Missing user id");
  }
  const id = String(userId).trim();
  let res;
  try {
    res = await api.get(`/user/${id}`);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.get(`/user/${id}/`);
  }
  return pickUserFromResponse(res);
};

/**
 * PATCH /user/:id - update user details (name, theme, etc.).
 */
export const updateUser = async (userId, data) => {
  if (userId == null || String(userId).trim() === "") {
    throw new Error("Missing user id");
  }
  const res = await api.patch(`/user/${userId}`, data);
  return { res, patchPayload: pickUserFromResponse(res) };
};

/**
 * GET /user - list all users.
 */
export const getAllUsers = async () => {
  const res = await api.get('/user');
  const payload = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return payload;
};

/**
 * GET /user/email/:email - find user by email.
 */
export const getUserByEmail = async (email) => {
  return api.get(`/user/email/${encodeURIComponent(email)}`);
};

/**
 * GET administrators - fetch all site administrators.
 */
export const getAdministrators = async () => {
  let fromApi = [];
  // Try common paths
  for (const path of ['/administrator/', '/administrator']) {
    try {
      const res = await api.get(path);
      const raw = res?.data?.data ?? res?.data;
      fromApi = mapRowsToAdministrators(Array.isArray(raw) ? raw : []);
      if (fromApi.length > 0) break;
    } catch (e) {
      if (e.response?.status !== 404 && e.response?.status !== 403) {
        console.warn(`getAdministrators: GET ${path}`, e);
      }
    }
  }
  // Fallback path
  if (fromApi.length === 0) {
    try {
      const res = await api.get('/user/administrators');
      const raw = res?.data?.data ?? res?.data;
      fromApi = mapRowsToAdministrators(Array.isArray(raw) ? raw : []);
    } catch (e2) {
      if (e2.response?.status !== 404 && e2.response?.status !== 403) {
        console.warn('getAdministrators: GET /user/administrators', e2);
      }
    }
  }
  return fromApi;
};

/**
 * Get user theme preference.
 */
export const getUserTheme = async (userId) => {
  const user = await getUserById(userId);
  return user?.theme;
};

/**
 * Update user theme preference.
 */
export const updateUserTheme = async (userId, theme) => {
  return updateUser(userId, { theme });
};
