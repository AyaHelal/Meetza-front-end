import api from "../../../API/axiosInstance";

function pickUserFromResponse(res) {
  const root = res?.data;
  const payload = root?.data ?? root?.user ?? root;
  return payload && typeof payload === "object" ? payload : null;
}

/**
 * PATCH /user/:id — partial JSON update (name, etc.). Photo uploads use multipart in {@link UserPhoto}.
 */
export async function patchUser(userId, body) {
  if (userId == null || String(userId).trim() === "") {
    throw new Error("Missing user id");
  }
  const res = await api.patch(`/user/${userId}`, body);
  return { res, patchPayload: pickUserFromResponse(res) };
}

/**
 * GET /user/:id — full user (often includes position_id when login payload is minimal).
 */
export async function getUser(userId) {
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
}

function looksLikePositionRecord(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  return (
    o.title != null ||
    o.name != null ||
    o.Title != null ||
    o.position_name != null ||
    o.position_title != null ||
    (o.id != null && (o.position_id != null || String(o.id).length > 20))
  );
}

function pickPositionPayload(root) {
  if (root == null) return null;
  const layers = [root, root?.data, root?.data?.data, root?.position, root?.data?.position].filter(Boolean);
  for (const layer of layers) {
    if (typeof layer === "string" && layer.trim()) return { title: layer.trim() };
    if (looksLikePositionRecord(layer)) return layer;
    if (layer && typeof layer === "object" && Array.isArray(layer.data) && looksLikePositionRecord(layer.data[0])) {
      return layer.data[0];
    }
  }
  return null;
}

function pickPositionFromResponse(res) {
  return pickPositionPayload(res?.data);
}

function pickPositionsArray(root) {
  if (root == null) return [];
  if (typeof root === "string") {
    const t = root.trim();
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        const parsed = JSON.parse(t);
        return pickPositionsArray(parsed);
      } catch {
        return [];
      }
    }
    return [];
  }
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.data?.data)) return root.data.data;
  if (Array.isArray(root?.positions)) return root.positions;
  return [];
}

/**
 * GET /position — list all positions (no id in path).
 * Response is often a raw array: `[{ "id", "title", "administrator_id", ... }]`.
 */
export async function getPositionsList() {
  let res;
  try {
    res = await api.get("/position");
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.get("/position/");
  }
  const list = pickPositionsArray(res?.data);
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

/**
 * POST /position — create position (e.g. title). Admin/super admin only.
 */
export async function postPosition(body) {
  let res;
  try {
    res = await api.post("/position", body);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    res = await api.post("/position/", body);
  }
  return { res, positionPayload: pickPositionFromResponse(res) };
}

export function positionRecordId(row) {
  if (!row || typeof row !== "object") return null;
  const id = row.id ?? row.position_id ?? row._id ?? row.uuid;
  return id != null && String(id).trim() !== "" ? String(id).trim() : null;
}

/** Pick the list row whose id matches the user's position_id (or nested position id). */
export function findPositionInList(list, positionId) {
  if (!positionId || !Array.isArray(list)) return null;
  const want = String(positionId).trim();
  const found = list.find((p) => {
    const id = positionRecordId(p);
    return id != null && id === want;
  });
  return found && typeof found === "object" ? found : null;
}

/**
 * Row to show on profile: match by position id, else row where administrator_id is current user,
 * else single row if list length is 1 (API returns `[{ id, title, ... }]`).
 */
export function resolveProfilePositionRow(list, positionId, userIdForAdminMatch) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (positionId) {
    const hit = findPositionInList(list, positionId);
    if (hit) return hit;
  }
  if (userIdForAdminMatch != null && String(userIdForAdminMatch).trim() !== "") {
    const uid = String(userIdForAdminMatch).trim();
    const byAdmin = list.find((p) => String(p.administrator_id ?? p.administratorId ?? "").trim() === uid);
    if (byAdmin) return byAdmin;
  }
  if (list.length === 1) return list[0];
  return null;
}

/**
 * PUT /position/:id — update position (e.g. title).
 */
export async function putPosition(positionId, body) {
  if (positionId == null || String(positionId).trim() === "") {
    throw new Error("Missing position id");
  }
  const id = String(positionId).trim();
  const res = await api.put(`/position/${id}`, body);
  return { res, positionPayload: pickPositionFromResponse(res) };
}

/**
 * DELETE /position/:id — remove position (administrator / super admin flows).
 */
export async function deletePosition(positionId) {
  if (positionId == null || String(positionId).trim() === "") {
    throw new Error("Missing position id");
  }
  const id = String(positionId).trim();
  try {
    await api.delete(`/position/${id}`);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    await api.delete(`/position/${id}/`);
  }
}
